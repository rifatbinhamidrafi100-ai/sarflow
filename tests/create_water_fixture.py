"""Generate local SOFTWARE TEST inputs, never real observations."""
import sys
import json
from pathlib import Path
from test_water import fixture, np, rasterio, from_origin
root=Path(sys.argv[1]);inputs=root/'data/water-inputs';inputs.mkdir(parents=True,exist_ok=True)
for i in range(4):fixture(inputs/f'{i}.h5',i)
with rasterio.open(inputs/'terrain.tif','w',driver='GTiff',height=16,width=16,count=1,dtype='uint8',crs='EPSG:32646',transform=from_origin(500000,2700010,10,10)) as dst:dst.write(np.zeros((16,16),dtype=np.uint8),1)
manifest=dict(dataType='synthetic-software-fixture',location='Software fixture only',files=[f'{i}.h5' for i in range(4)],row=0,col=0,height=16,width=16,frequency='A',co='HHHH',cross='HVHV',terrain=dict(file='terrain.tif',source='Synthetic test',method='Software fixture'))
(inputs/'fixture.json').write_text(json.dumps(manifest),encoding='utf-8')
