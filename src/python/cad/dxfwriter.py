import ezdxf
import sys
import demjson
import math
import decimal
import os
import requests
import cad.utils as utils


class DxfWriter:
    def __init__(self, host='http://localhost/n/sd/index/'):
        self.host = host

    def saveDxf(self, dxfPath, data, vars={}, drawComponents=True, changeLineLength=True):
        if vars.get('背框宽') is None:
            vars['背框宽'] = 50

        dxf = ezdxf.new('R2013', setup=True)
        layers = self.__getLayers(data)
        for layer in layers.values():
            if layer['name'] == 'Defpoints':
                continue
            try:
                dxf.layers.remove(layer['name'])
            except:
                pass
            dxf.layers.new(layer['name'], {'color': layer['color']})
        allEntities = utils.getEntities(data)
        self.allEntities = allEntities
        self.data = data

        if changeLineLength:
            formulas = {}
            for id in allEntities['line']:
                line = allEntities['line'][id]
                if line.get('gongshi') is None or len(line['gongshi']) < 1:
                    continue
                if line.get('mingzi') and len(line['mingzi']) > 0:
                    name = line['mingzi']
                else:
                    name = 'line'+id
                formulas[name] = line['gongshi']

            formulas = self.__calculate(formulas, vars)
            for id in allEntities['line']:
                line = allEntities['line'][id]
                if line.get('mingzi') and len(line['mingzi']) > 0:
                    name = line['mingzi']
                else:
                    name = 'line'+id
                if formulas.get(name):
                    vars[name +
                         '变化值'] = self.__setLineLength(line, formulas[name])
            formulas = {}
            for id in allEntities['line']:
                line = allEntities['line'][id]
                if line.get('guanlianbianhuagongshi') is None or len(line['guanlianbianhuagongshi']) < 1:
                    continue
                if line.get('mingzi') and len(line['mingzi']) > 0:
                    name = line['mingzi']
                else:
                    name = 'line'+id
                formulas[name] = line['guanlianbianhuagongshi']
            formulas = self.__calculate(formulas, vars)
            for id in allEntities['line']:
                line = allEntities['line'][id]
                if line.get('mingzi') and len(line['mingzi']) > 0:
                    name = line['mingzi']
                else:
                    name = 'line'+id
                if formulas.get(name):
                    start = ezdxf.math.Vec2(line['start'])
                    end = ezdxf.math.Vec2(line['end'])
                    length = start.distance(end) - formulas[name]
                    self.__setLineLength(line, length)

        self.__draw(dxf, data, allEntities)
        formulas = {}
        if drawComponents and 'components' in data:
            for i in range(len(data['components']['connections'])):
                formulas['i' +
                         str(i)] = data['components']['connections'][i]['space']
        formulas = self.__calculate(formulas, vars)
        if drawComponents and 'components' in data:
            temp = data['components']['connections']
            data['components']['connections'] = []
            for i in range(len(temp)):
                conn = temp[i]
                conn['space'] = formulas['i'+str(i)]
                self.__assembleComponents(conn)
            for component in data['components']['data']:
                self.__draw(dxf, component, allEntities)
        if 'partners' in data:
            for partner in data['partners']:
                self.__draw(dxf, partner, allEntities)

        dxf.saveas(dxfPath)
        return dxf

    def __draw(self, dxf, data, allEntities):
        msp = dxf.modelspace()
        entities = data['entities']
        if utils.isObject(entities['line']):
            for line in entities['line'].values():
                msp.add_line(line['start'], line['end'], {
                    'layer': line['layer'], 'color': line['color']})
        if utils.isObject(entities['circle']):
            for circle in entities['circle'].values():
                msp.add_circle(circle['center'], circle['radius'], {
                    'layer': circle['layer'], 'color': circle['color']})
        if utils.isObject(entities['arc']):
            for arc in entities['arc'].values():
                msp.add_arc(arc['center'], arc['radius'], arc['start_angle'], arc['end_angle'],
                            not arc['clockwise'], {'layer': arc['layer'], 'color': arc['color']})
        if utils.isObject(entities['mtext']):
            for mtext in entities['mtext'].values():
                e = msp.add_mtext(mtext['text'], {
                    'layer': mtext['layer'], 'color': mtext['color'], 'insert': mtext['insert']})
                e.dxf.char_height = mtext['font_size']

        def getPoint(line, location):
            start = list(map(lambda n: float(n), line['start']))
            end = list(map(lambda n: float(n), line['end']))
            if location == 'start':
                if 'pointSwaped' in line and line['pointSwaped']:
                    return end
                else:
                    return start
            if location == 'end':
                if 'pointSwaped' in line and line['pointSwaped']:
                    return start
                else:
                    return end
            if location == 'center':
                return [(start[0]+end[0])/2, (start[1]+end[1])/2]
        if utils.isObject(entities['dimension']):
            for dimension in entities['dimension'].values():
                p1 = None
                p2 = None
                if dimension.get('entity1') and dimension['entity1'].get('id') and dimension['entity1'].get('location'):
                    if allEntities['line'].get(dimension['entity1']['id']):
                        line1 = allEntities['line'][dimension['entity1']['id']]
                        p1 = getPoint(line1, dimension['entity1']['location'])
                if dimension.get('entity2') and dimension['entity2'].get('id'):
                    if allEntities['line'].get(dimension['entity2']['id']):
                        line2 = allEntities['line'][dimension['entity2']['id']]
                        p2 = getPoint(line2, dimension['entity2']['location'])
                if p1 and p2:
                    distance = float((dimension['distance']))
                    x = max(p1[0], p2[0])+distance
                    y = max(p1[1], p2[1])+distance
                    if dimension['axis'] == 'x':
                        p0 = [p1[0], y, 0]
                    if dimension['axis'] == 'y':
                        p0 = [x, p1[1], 0]
                    text = dimension['mingzi']
                    if dimension['qujian']:
                        text += ' '+dimension['qujian']
                    dim = msp.add_linear_dim(p0, p1, p2, text=text, dimstyle=dimension['dimstyle'], dxfattribs={
                        'layer': dimension['layer']})
                    if dimension['font_size'] == 2.5:
                        dim.dimension.get_dim_style().dxf.dimtxt = 36
                    else:
                        dim.dimension.get_dim_style(
                        ).dxf.dimtxt = dimension['font_size']
                    dim.render()
        if utils.isObject(entities['hatch']):
            for hatch in entities['hatch'].values():
                entity = msp.add_hatch(
                    hatch['color'], {'layer': hatch['layer']})
                if hatch.get('bgcolor'):
                    entity.bgcolor = hatch['bgcolor']
                else:
                    entity.bgcolor = (0, 0, 0)
                with entity.edit_boundary() as boundary:
                    for path in hatch['paths']:
                        if 'edges' in path and len(path['edges']):
                            edgePath = boundary.add_edge_path()
                            for edge in path['edges']:
                                edgePath.add_line(edge['start'], edge['end'])
                        boundary.add_polyline_path(path['vertices'])

    def __getLayers(self, data):
        result = {}
        if utils.isObject(data.get('layers')):
            result.update(data['layers'])
        if utils.isArray(data.get('partners')):
            for partner in data['partners']:
                result.update(self.__getLayers(partner))
        if utils.isObject(data.get('components')) and utils.isArray(data['components'].get('data')):
            for component in data['components']['data']:
                result.update(self.__getLayers(component))
        return result

    def __setLineLength(self, line, length):
        pointsMap = utils.generatePointsMap(self.allEntities)
        start = ezdxf.math.Vec2(line['start'])
        end = ezdxf.math.Vec2(line['end'])
        result = utils.findAllAdjacentLines(pointsMap, line, end)
        entities = result['entities']
        d = start.distance(end)-length
        theta = math.atan2(start.y-end.y, start.x-end.x)
        dx = math.cos(theta)*d
        dy = math.sin(theta)*d
        line['end'][0] = float(line['end'][0]) + dx
        line['end'][1] = float(line['end'][1]) + dy
        for entity in entities:
            if entity['type'] == "LINE":
                entity['start'][0] = float(entity['start'][0]) + dx
                entity['start'][1] = float(entity['start'][1]) + dy
                entity['end'][0] = float(entity['end'][0]) + dx
                entity['end'][1] = float(entity['end'][1]) + dy
            if entity['type'] == "ARC":
                center = entity['center']
                points = utils.getPointsFromArc(entity)
                startAngle = math.atan2(start.y-center[1], start.x-center[0])
                endAngle = math.atan2(end.y-center[1], end.x-center[0])
                entity['start_angle'] = startAngle/math.pi*180
                entity['end_angle'] = endAngle/math.pi*180
        return d

    def __findEntity(self, entities, id):
        for type in entities:
            if utils.isObject(entities[type]):
                if entities[type].get(id) and id == entities[type][id]:
                    return entities[type][id]
                for e in entities[type].values():
                    if id == e['id']:
                        return e
        return None

    def __moveComponent(self, curr, translate, prev=None):
        map = {}
        for conn in self.data['components']['connections']:
            if curr['id'] in conn['ids']:
                for id in conn['ids']:
                    if id == self.data['id']:
                        if conn['axis'] == 'x':
                            translate[0] = 0
                        if conn['axis'] == 'y':
                            translate[1] = 0
                    if prev and id != curr['id'] and id != prev['id']:
                        if map.get(id) is None:
                            map[id] = {}
                        map[id][conn['axis']] = conn['space']
        utils.transformCadData(curr, {'translate': translate})
        for id in map:
            next = None
            for v in self.data['components']['data']:
                if v['id'] == id:
                    next = v
                    break
            if next:
                newTranslate = list(translate)
                if map[id].get('x') is None:
                    newTranslate[0] = 0
                if map[id].get('y') is None:
                    newTranslate[1] = 0
                self.__moveComponent(next, newTranslate, curr)

    def __assembleComponents(self, connection):
        ids = connection['ids']
        lines = connection['lines']
        space = connection['space']
        position = connection['position']
        components = self.data['components']
        c1 = None
        c2 = None
        for c in components['data']:
            if c['id'] == ids[0] or c['originalId'] == ids[0]:
                c1 = c
            if c['id'] == ids[1] or c['originalId'] == ids[1]:
                c2 = c
            if c1 and c2:
                break
        if c1 is None and c2 is None:
            return
        if c1 is None:
            c1 = self.data
        if c2 is None:
            c2 = self.data

        def getLine(e, l):
            start = ezdxf.math.Vec2(e['center'])
            end = ezdxf.math.Vec2(e['center'])
            if l.slope == math.inf:
                end.y += 1
            if l.slope == 0:
                end.x += 1
            return utils.Line(start, end)
        if position == 'absolute':
            e1 = self.__findEntity(c1['entities'], lines[0])
            e2 = self.__findEntity(c2['entities'], lines[1])
            if e1 is None or e2 is None:
                return
            # space = float(space)
            l1 = None
            l2 = None
            if e1['type'] == 'LINE':
                l1 = utils.Line(e1['start'], e1['end'])
            if e2['type'] == 'LINE':
                l2 = utils.Line(e2['start'], e2['end'])
            if l1 is None and l2 is None:
                return
            if l1 is None:
                if e1['type'] == 'CIRCLE':
                    l1 = getLine(e1, l2)
                else:
                    return
            if l2 is None:
                if e2['type'] == 'CIRCLE':
                    l2 = getLine(e2, l1)
                else:
                    return
            translate = [0, 0]
            if utils.isLinesParallel([l1, l2]):
                if l1.slope == math.inf:
                    translate[0] = l1.start.x - l2.start.x + space
                    axis = 'x'
                if l1.slope == 0:
                    translate[1] = l1.start.y - l2.start.y+space
                    axis = 'y'
            else:
                return

        self.__moveComponent(c2, translate, c1)
        components['connections'].append(connection)

    def __calculate(self, formulas, vars):
        url = self.host + 'order/api/calc'
        postData = {'formulas': demjson.encode(
            formulas), 'vars': demjson.encode(vars)}
        result = dict()
        try:
            result = demjson.decode(requests.post(url, data=postData).text)[
                'data']['succeed']
        except Exception as _:
            pass
        toRemove = []
        for name in result:
            try:
                result[name] = float(result[name])
            except:
                toRemove.append(name)
        if not utils.isObject(result):
            result = {}
        else:
            for name in toRemove:
                del result[name]
        return result
