import ezdxf
import demjson
import uuid
import re
import math
import cad.utils as utils


class DxfReader:
    def __init__(self, abs_tol=20):
        self.abs_tol = abs_tol

    def parseDxf(self, dxfPath, encode=True):
        tol = self.abs_tol
        dwg = ezdxf.readfile(dxfPath)
        msp = dwg.modelspace()
        result = {
            'layers': {},
            'entities': {
                'line': {},
                'arc': {},
                'circle': {},
                'hatch': {},
                'dimension': {},
                'mtext': {}
            },
            'lineText': {},
            'globalText': {}
        }
        lines = []
        mtexts = []
        dimensions = []
        self.__result = result
        self.__lines = lines
        self.__mtexts = mtexts
        self.__dimensions = dimensions
        self.__msp = msp
        for l in dwg.layers:
            layer = {
                'id': str(uuid.uuid1()),
                'name': l.dxf.name,
                'color': l.dxf.color
            }
            result['layers'][layer['id']] = layer
        for entity in msp:
            self.__parseEntity(entity)

        for line in lines:
            start = line['start'].vec2
            end = line['end'].vec2
            x1 = start.x
            y1 = start.y
            x2 = end.x
            y2 = end.y
            theta = math.pi/2-math.atan2(y2-y1, x2-x1)
            if start.distance(end) == 0:
                continue
            a = math.sin(theta)
            b = math.cos(theta)
            rect = [
                ezdxf.math.Vec2(x1+tol*b, y1+tol*a),
                ezdxf.math.Vec2(x2+tol*b, y2+tol*a),
                ezdxf.math.Vec2(x2-tol*b, y2-tol*a),
                ezdxf.math.Vec2(x1-tol*b, y1-tol*a)
            ]
            for dimension in dimensions:
                p = dimension['defpoint'].vec2
                p1 = dimension['defpoint2'].vec2
                p2 = dimension['defpoint3'].vec2
                dx1 = p.x - p1.x
                dy1 = p.y - p1.y
                dx2 = p.x - p2.x
                dy2 = p.y - p2.y
                if abs(dx1) < 0.1:
                    dimension['axis'] = 'x'
                    if p1.y > p2.y:
                        p3 = p1
                    else:
                        p3 = p2
                    dimension['distance'] = p.y - p3.y
                elif abs(dx2) < 0.1:
                    dimension['axis'] = 'x'
                    if p1.y > p2.y:
                        p3 = p1
                    else:
                        p3 = p2
                    dimension['distance'] = p.y - p3.y
                elif abs(dy1) < 0.1:
                    dimension['axis'] = 'y'
                    if p1.x > p2.x:
                        p3 = p1
                    else:
                        p3 = p2
                    dimension['distance'] = p.x - p3.x
                elif abs(dy2) < 0.1:
                    dimension['axis'] = 'y'
                    if p1.x > p2.x:
                        p3 = p1
                    else:
                        p3 = p2
                    dimension['distance'] = p.x - p3.x
                p1OnLine = ezdxf.math.is_point_on_line_2d(
                    p1, start, end, False, tol)
                p2OnLine = ezdxf.math.is_point_on_line_2d(
                    p2, start, end, False, tol)
                if p1OnLine:
                    if p1.isclose(start, tol/10):
                        location = 'start'
                    elif p1.isclose(end, tol/10):
                        location = 'end'
                    else:
                        location = 'center'
                    dimension['entity1'] = {
                        'id': line['id'], 'location': location}
                if p2OnLine:
                    if p2.isclose(start, tol/10):
                        location = 'start'
                    elif p2.isclose(end, tol/10):
                        location = 'end'
                    else:
                        location = 'center'
                    dimension['entity2'] = {
                        'id': line['id'], 'location': location}
                if p1OnLine and p2OnLine:
                    # print(dimension)
                    line['mingzi'] = dimension['text']['mingzi']
                    line['qujian'] = dimension['text']['qujian']
                    line['gongshi'] = dimension['text']['gongshi'].split(
                        '=')[-1]
                    if result['entities']['dimension'].get(dimension['id']):
                        del result['entities']['dimension'][dimension['id']]
                dimension['mingzi'] = dimension['text']['mingzi']
                dimension['qujian'] = dimension['text']['qujian']
                # dimension['gongshi'] = dimension['text']['gongshi']
            for mtext in mtexts:
                insert = mtext['insert'].vec2
                if (ezdxf.math.is_point_in_polygon_2d(insert, rect, tol) == 1):
                    line['mingzi'] = mtext['text']['mingzi']
                    line['qujian'] = mtext['text']['qujian']
                    line['gongshi'] = mtext['text']['gongshi'].split('=')[-1]
        for dimension in dimensions:
            del dimension['defpoint']
            del dimension['defpoint2']
            del dimension['defpoint3']
            del dimension['text']
        for mtext in mtexts:
            mtext['text'] = mtext['text']['text']
        if encode:
            return demjson.encode(result)
        return result

    def unfold(self, data, height):
        entities = utils.getEntities(data)
        pointsMap = utils.generatePointsMap(entities)
        arr = []
        for v in pointsMap:
            if len(v['lines']) == 1:
                arr.append(v)
        if len(arr) != 2:
            raise "无效的图形"
        start = arr[0]
        end = arr[1]
        startLine = start['lines'][0]
        startPoint = start['point']
        if startPoint.__eq__(ezdxf.math.Vec2(startLine['start'])):
            startPoint = ezdxf.math.Vec2(startLine['end'])
        else:
            startPoint = ezdxf.math.Vec2(startLine['start'])
        lines = utils.findAllAdjacentLines(
            pointsMap, startLine, startPoint)['entities']
        lines.insert(0, startLine)

        result = {
            'layers': {},
            'entities': {
                'line': {},
                'circle': {},
                'arc': {},
                'hatch': {},
                'mtext': {},
                'dimension': {}
            }
        }
        offset = 0
        for i in range(len(lines)+1):
            id = str(uuid.uuid4())
            start = [offset, 0]
            end = [offset, height]
            result['entities']['line'][id] = {
                'color': 7,
                'end': end,
                'gongshi': "",
                'guanlianbianhuagongshi': "",
                'id': id,
                'layer': "0",
                'mingzi': "",
                'originalId': id,
                'qujian': "",
                'start': start,
                'type': "LINE",
            }
            if i < len(lines):
                start = ezdxf.math.Vec2(lines[i]['start'])
                end = ezdxf.math.Vec2(lines[i]['end'])
                offset += start.distance(end)
        return result

    def sort(self, data):
        entities = utils.getEntities(data)
        pointsMap = utils.generatePointsMap(entities)
        arr = []
        result = []
        for v in pointsMap:
            if len(v['lines']) == 1:
                arr.append(v)
        exclude = []
        for v in arr:
            startLine = v['lines'][0]
            if startLine['id'] in exclude:
                continue
            startPoint = v['point']
            if v['point'].__eq__(ezdxf.math.Vec2(startLine['end'])):
                tmp = startLine['start']
                startLine['start'] = startLine['end']
                startLine['end'] = tmp
            startPoint = ezdxf.math.Vec2(startLine['end'])
            lines = [startLine]
            adjLines = utils.findAllAdjacentLines(
                pointsMap, startLine, startPoint)['entities']
            exclude.append(adjLines[len(adjLines)-1]['id'])
            lines.extend(adjLines)
            result.append(lines)
        return data

    def __parseEntity(self, entity):
        vid = str(uuid.uuid1())
        dxftype = entity.dxftype()
        result = self.__result
        lines = self.__lines
        mtexts = self.__mtexts
        dimensions = self.__dimensions
        msp = self.__msp
        data = {
            'originalId': vid,
            'id': vid,
            'type': dxftype,
            'layer': getattr(entity.dxf, 'layer', None),
            'color': getattr(entity.dxf, 'color', None)
        }
        if dxftype == 'LINE':
            if not entity.dxf.start.__eq__(entity.dxf.end):
                data['start'] = entity.dxf.start
                data['end'] = entity.dxf.end
                result['entities']['line'][vid] = data
                lines.append(data)
        if dxftype == 'ARC' or dxftype == 'CIRCLE':
            data['center'] = entity.dxf.center
            data['radius'] = entity.dxf.radius
            if dxftype == 'ARC':
                data['start_angle'] = entity.dxf.start_angle
                data['end_angle'] = entity.dxf.end_angle
                data['clockwise'] = False
                result['entities']['arc'][vid] = data
            else:
                result['entities']['circle'][vid] = data
        if dxftype == 'MTEXT' or dxftype == 'TEXT':
            if dxftype == 'MTEXT':
                data['text'] = self.__getText(entity.plain_text())
                data['font_size'] = entity.dxf.char_height
                anchor = entity.dxf.attachment_point
                if anchor == 1:
                    data['anchor'] = [0, 0]
                if anchor == 2:
                    data['anchor'] = [0.5, 0]
                if anchor == 3:
                    data['anchor'] = [1, 0]
                if anchor == 4:
                    data['anchor'] = [0, 0.5]
                if anchor == 5:
                    data['anchor'] = [0.5, 0.5]
                if anchor == 6:
                    data['anchor'] = [1, 0.5]
                if anchor == 7:
                    data['anchor'] = [0, 1]
                if anchor == 8:
                    data['anchor'] = [0.5, 1]
                if anchor == 9:
                    data['anchor'] = [1, 1]
            else:
                data['text'] = self.__getText(entity.dxf.text)
                data['type'] = 'MTEXT'
                data['font_size'] = entity.dxf.height
                data['anchor'] = [0, 1]
            data['insert'] = entity.dxf.insert
            result['entities']['mtext'][vid] = data
            mtexts.append(data)
        if dxftype == 'DIMENSION':
            tmp = msp.add_mtext(entity.dxf.text)
            data['text'] = self.__getText(tmp.plain_text())
            data['font_size'] = entity.get_dim_style().dxf.dimtxt
            if data['font_size'] == 2.5:
                data['font_size'] = 36
            data['dimstyle'] = entity.dxf.dimstyle
            data['defpoint'] = entity.dxf.defpoint
            data['defpoint2'] = entity.dxf.defpoint2
            data['defpoint3'] = entity.dxf.defpoint3
            data['dimtype'] = entity.dxf.dimtype
            result['entities']['dimension'][vid] = data
            dimensions.append(data)
        if dxftype in ["HATCH"]:
            data['paths'] = []
            try:
                data['bgcolor'] = entity.bgcolor
            except:
                data['bgcolor'] = (0, 0, 0)
            for i in range(len(entity.paths)):
                if getattr(entity.paths[i], 'edges', None):
                    path = {'edges': []}
                    for j in range(len(entity.paths[i].edges)):
                        edge = {}
                        if entity.paths[i].edges[j].EDGE_TYPE == 'LineEdge':
                            edge['start'] = entity.paths[i].edges[j].start
                            edge['end'] = entity.paths[i].edges[j].end
                            path['edges'].append(edge)
                    data['paths'].append(path)
                if getattr(entity.paths[i], 'vertices', None):
                    path = {'vertices': entity.paths[i].vertices}
                    data['paths'].append(path)
            result['entities']['hatch'][vid] = data
        if dxftype == 'LWPOLYLINE':
            for vEntity in entity.virtual_entities():
                self.__parseEntity(vEntity)

    def __getText(self, text):
        result = {'text': '', 'mingzi': '', 'qujian': '', 'gongshi': ''}
        if(text is None):
            return result
        m = re.sub(r'\\P', '\\n', text)
        m = re.sub(r'\\([LIOoKkXQHWFSACT~]|pxi)', '', m)
        if m is None:
            return result
        result['text'] = m
        n = m.split(';')
        for s in n:
            if "=" in s:
                result['gongshi'] = s
            elif '~' in s or '-' in s:
                result['qujian'] = s
            elif '/' in s:
                result['qujian'] = s.replace('/', ', ')
            else:
                result['mingzi'] = s
        return result

    def __extractText(self, entities):
        for e in entities:
            if e['text'].get('to'):
                self.__result['lineText'][e['id']] = e
            else:
                self.__result['globalText'][e['id']] = e
