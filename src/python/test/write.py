import os
import sys
import ezdxf
import demjson
import json

sys.path.append("./")
sys.path.append("./cad")
from cad.dxfwriter import DxfWriter

writer = DxfWriter('http://www.n.com:12305/n/zy/index/')
inputDir = './test/input/'
outputDir = './test/output/'
vars = {'包框高': 2200, '墙厚': 250, '锁中': 1050}
for file in os.listdir(inputDir):
    info = os.path.splitext(file)
    if info[1] == '.json':
        print(file+'...')
        with open(inputDir+file, encoding='utf-8') as file:
            data = demjson.decode(file.read())
            writer.saveDxf(outputDir+info[0]+'.dxf', data, vars)
            print('done')
