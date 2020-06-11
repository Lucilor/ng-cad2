import json
import demjson
import ezdxf
import sys
import os
sys.path.append("./")
sys.path.append("./cad")
from cad.dxfwriter import DxfWriter
from cad.dxfreader import DxfReader

reader = DxfReader()
writer = DxfWriter()
inputDir = './test/input/'
outputDir = './test/output/'
# for file in os.listdir(inputDir):
#     info = os.path.splitext(file)
#     if info[1] == '.dxf':
#         print(file+'...')
#         data = reader.parseDxf(inputDir+file)
#         with open(outputDir+info[0]+'.json', 'w+') as file:
#             file.write(data)
#             print('done')

# for file in os.listdir(inputDir):
#     info = os.path.splitext(file)
#     if info[1] == '.json':
#         print(file+'...')
#         with open(inputDir+file, encoding='utf-8') as file:
#             data = demjson.decode(file.read())
#             data = reader.unfold(data, 100)
#             writer.saveDxf(outputDir+info[0]+'_unfolded.dxf', data, {})
#             print('done')

for file in os.listdir(inputDir):
    info = os.path.splitext(file)
    if info[1] == '.json':
        print(file+'...')
        with open(inputDir+file, encoding='utf-8') as file:
            data = demjson.decode(file.read())
            data = reader.sort(data)
            print('done')
