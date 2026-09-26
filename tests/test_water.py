"""Software fixtures only: no NASA observations and no real-event accuracy claims."""
import sys
import json
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import h5py
import numpy as np
import rasterio
from rasterio.transform import from_origin
from gcov_reader import BASE, IDENTITY, PARAMS, flag, metadata, read_tile
from water_algorithm import classify
from water_pipeline import run, read_terrain
from rasterio.windows import Window


def fixture(path,index):
    with h5py.File(path,'w') as f:
        identity=f.create_group(IDENTITY)
        values=dict(productType='GCOV',productVersion='1',productSpecificationVersion='1.2.1',trackNumber='1',frameNumber='1',lookDirection='Right',orbitPassDirection='Ascending',radarBand='L',processingType='Custom',isGeocoded='True',granuleId=f'SYNTHETIC-FIXTURE-{index}',zeroDopplerStartTime=f'2026-01-{index+1:02d}T00:00:00Z',processingDateTime='2026-02-01T00:00:00Z')
        for k,v in values.items():identity[k]=v
        p=f.create_group(PARAMS)
        for k in ['radiometricTerrainCorrectionApplied','shadowMaskingApplied','rfiMitigationApplied','noiseCorrectionApplied']:p[k]='True'
        p['rtc/outputBackscatterNormalizationConvention']='gamma0';p['rtc/outputBackscatterExpressionConvention']='linear'
        f[BASE+'/metadata/processingInformation/algorithms/softwareVersion']='fixture-v1'
        grid=f.create_group(BASE+'/grids/frequencyA');grid['projection']=32646
        grid['xCoordinates']=500005+np.arange(16)*10;grid['yCoordinates']=2700005-np.arange(16)*10
        for channel,db in [('HHHH',-10),('HVHV',-15)]:
            data=np.full((16,16),10**(db/10));data[:4]=10**((-25 if channel=='HHHH' else -30)/10)
            if index==3:data[4:8]=10**((-25 if channel=='HHHH' else -30)/10)
            grid[channel]=data;grid[channel].attrs['units']='1'
        grid['mask']=np.ones((16,16),dtype=np.uint8);grid['numberOfLooks']=np.ones((16,16))


class WaterTests(unittest.TestCase):
    def test_terrain_validity_regressions(self):
        cases = [('nodata-zero', 0, False, [0,0,0,0], [255,255,255,255]),
                 ('internal-mask', None, True, [0,0,0,0], [255,0,0,0]),
                 ('clear-zero', None, False, [0,0,0,0], [0,0,0,0]),
                 ('unsupported', None, False, [7,256,-1,.5], [255,255,255,255])]
        with tempfile.TemporaryDirectory() as td:
            for name,nodata,internal,values,expected in cases:
                with self.subTest(name=name):
                    p=Path(td)/(name+'.tif')
                    with rasterio.open(p,'w',driver='GTiff',height=1,width=4,count=1,dtype='float32',nodata=nodata,transform=from_origin(500000,2700010,10,10),crs='EPSG:32646') as dst:
                        dst.write(np.array([values],dtype=np.float32),1)
                        if internal:dst.write_mask(np.array([[0,255,255,255]],dtype=np.uint8))
                    with rasterio.open(p) as src:terrain=read_terrain(src,Window(0,0,4,1))
                    self.assertEqual(terrain.tolist(),[expected])
                    co=np.full((4,1,4),.001);out=classify(co,co/10,terrain)
                    self.assertEqual(out['classes'].tolist(),[[1 if v==0 else 5 for v in expected]])
                    self.assertEqual((out['reasons'] & 2).tolist(),[[0 if v==0 else 2 for v in expected]])

    def test_flags_are_not_python_truthiness(self):
        self.assertFalse(flag('False'));self.assertIsNone(flag(None))
        with self.assertRaises(ValueError):flag('yes')

    def test_subswath_codes_and_missing_quality(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'fixture.h5';fixture(p,0)
            with h5py.File(p,'r+') as f:
                g=f[BASE+'/grids/frequencyA'];g['mask'][0,:8]=[0,1,2,3,4,5,255,6]
                _,valid,known=read_tile(f,'A','HHHH',0,0,16,16)
                self.assertTrue(known);self.assertEqual(valid[0,:8].tolist(),[False,True,True,True,True,True,False,False])
                del g['mask'];_,valid,known=read_tile(f,'A','HHHH',0,0,16,16)
                self.assertFalse(known);self.assertFalse(valid.any())

    def test_radiometric_and_version_rejection(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'f.h5';fixture(p,0)
            with h5py.File(p,'r+') as f:
                metadata(f,'A','HHHH','HVHV')
                f[PARAMS+'/rtc/outputBackscatterExpressionConvention'][()]='dB'
                with self.assertRaisesRegex(ValueError,'linear gamma0'):metadata(f,'A','HHHH','HVHV')

    def test_candidate_classes_and_common_support(self):
        co=np.array([[.001,.1,.001,.1,np.nan],[.001,.1,.001,.1,.1],[.001,.1,.001,.1,.1],[.001,.001,.1,.1,.1]])[:,None,:]
        cross=co/10;r=classify(co,cross,np.zeros((1,5)))
        self.assertEqual(r['classes'].tolist(),[[1,2,3,4,0]])
        self.assertTrue(np.isnan(r['delta'][0,4]));self.assertEqual(int(r['common'].sum()),4)

    def test_missing_terrain_or_polarization_is_not_clear(self):
        co=np.full((4,2,2),.001)
        self.assertTrue(np.all(classify(co,co/10,None)['classes']==5))
        self.assertTrue(np.all(classify(co,None,np.zeros((2,2)))['classes']==5))
        self.assertTrue(np.all(classify(co,co/10,np.ones((2,2)))['classes']==0))
        with self.assertRaises(ValueError):classify(co[:3],None,None)

    def test_baseline_stability_and_no_probability(self):
        co=np.full((4,1,1),.001);co[1]=.1
        r=classify(co,co/10,np.zeros((1,1)))
        self.assertEqual(r['classes'][0,0],5);self.assertNotIn('confidence',r)

    def test_hdf5_pipeline_exports_native_tiles_and_provenance(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            for i in range(4):fixture(root/f'{i}.h5',i)
            with rasterio.open(root/'terrain.tif','w',driver='GTiff',height=16,width=16,count=1,dtype='uint8',crs='EPSG:32646',transform=from_origin(500000,2700010,10,10)) as f:f.write(np.zeros((16,16),dtype=np.uint8),1)
            m=dict(dataType='synthetic-software-fixture',location='Synthetic software test',files=[f'{i}.h5' for i in range(4)],row=0,col=0,height=16,width=16,frequency='A',co='HHHH',cross='HVHV',terrain=dict(file='terrain.tif',source='Synthetic test array',method='Fixture, not terrain observation'))
            (root/'manifest.json').write_text(json.dumps(m));r=run(root/'manifest.json',root/'out',{})
            self.assertEqual(r['commonValidCells'],256);self.assertEqual(r['counts']['2'],64)
            self.assertIsNone(r['accuracyEvaluation']);self.assertIsNone(r['areaKm2'])
            self.assertEqual(len(r['observations'][0]['sha256']),64)
            with rasterio.open(root/'out/classes.tif') as f:self.assertEqual(f.crs.to_epsg(),32646);self.assertEqual(f.block_shapes,[(256,256)])
            # Grid change must fail, not be resampled silently.
            with h5py.File(root/'3.h5','r+') as f:f[BASE+'/grids/frequencyA/xCoordinates'][0]+=1
            with self.assertRaises(ValueError):run(root/'manifest.json',root/'bad',{})

if __name__=='__main__':unittest.main()
