import math
import ezdxf


def isArray(v): return isinstance(v, (list, tuple))


def isObject(v): return isinstance(v, dict)


def getPointsFromArc(entity):
    center = entity['center']
    radius = entity['radius']
    startAngle = entity['start_angle']/180*math.pi
    endAngle = entity['end_angle']/180*math.pi
    dxStart = math.cos(startAngle)*radius
    dyStart = math.sin(startAngle)*radius
    dxEnd = math.cos(endAngle)*radius
    dyEnd = math.sin(endAngle)*radius
    startPoint = ezdxf.math.Vec2(center[0]+dxStart, center[1]+dyStart)
    endPoint = ezdxf.math.Vec2(center[0]+dxEnd, center[1]+dyEnd)
    return [startPoint, endPoint]


def generatePointsMap(entities, accuracy=1):
    pointsMap = []

    def addToMap(point, line):
        linesAtPoint = None
        for value in pointsMap:
            if value['point'].distance(point) <= accuracy:
                linesAtPoint = value
        if linesAtPoint:
            linesAtPoint['lines'].append(line)
        else:
            pointsMap.append({'point': point, 'lines': [line]})

    for id in entities["line"]:
        entity = entities["line"][id]
        start = ezdxf.math.Vec2(entity['start'])
        end = ezdxf.math.Vec2(entity['end'])
        addToMap(start, entity)
        addToMap(end, entity)
    for id in entities["arc"]:
        entity = entities["arc"][id]
        points = getPointsFromArc(entity)
        addToMap(points[0], entity)
        addToMap(points[1], entity)
    return pointsMap


def findAdjacentLines(pointsMap, entity, point, accuracy=1):
    if point is None and entity['type'] == "LINE":
        adjStart = findAdjacentLines(entity, entity['start'])
        adjEnd = findAdjacentLines(entity, entity['end'])
        return adjStart+adjEnd
    pal = None
    for value in pointsMap:
        if value['point'].distance(point) <= accuracy:
            pal = value
            break
    if pal:
        lines = []
        for line in pal['lines']:
            if line['id'] != entity['id']:
                lines.append(line)
        return lines
    return []


def findAllAdjacentLines(pointsMap, entity, point, accuracy=1):
    id = entity['id']
    t = entity
    entities = []
    closed = False
    # TODO: 有一定概率触发死循环
    i = 0
    while entity and point:
        i += 1
        if i > 1000:
            raise Exception('infinite loop')
        result = findAdjacentLines(pointsMap, entity, point, accuracy)
        if len(result):
            entity = findAdjacentLines(pointsMap, entity, point, accuracy)[0]
        else:
            entity = None
        if entity:
            if entity['id'] == id:
                closed = True
                break
            if entity['type'] == "LINE":
                entities.append(entity)
                start = ezdxf.math.Vec2(entity['start'])
                end = ezdxf.math.Vec2(entity['end'])
                if start.distance(point) <= accuracy:
                    point = end
                elif end.distance(point) <= accuracy:
                    point = start
                else:
                    point = None
            if entity['type'] == "ARC":
                entities.append(entity)
                points = getPointsFromArc(entity)
                if points[0].distance(point) <= accuracy:
                    point = points[0]
                elif points[1].distance(point) <= accuracy:
                    point = points[1]
                else:
                    point = None
    if True or closed:
        for i in range(len(entities)):
            if i == 0:
                if entity:
                    prev = entity
                else:
                    continue
            else:
                prev = entities[i-1]
            curr = entities[i]
            if not ezdxf.math.is_close_points(prev['end'], curr['start']):
                tmp = curr['start']
                curr['start'] = curr['end']
                curr['end'] = tmp

    return {'entities': entities, 'closed': closed}


def updateEntities(obj1, obj2):
    if obj1 is None:
        return {
            'line': {},
            'circle': {},
            'arc': {},
            'hatch': {},
            'mtext': {},
            'dimension': {}
        }
    for key in obj1:
        obj1[key].update(obj2[key])
    return obj1


def getEntities(data):
    result = updateEntities(None, None)
    if isObject(data.get('entities')):
        updateEntities(result, data['entities'])
    if isArray(data.get('partners')):
        for partner in data['partners']:
            updateEntities(result, getEntities(partner))
    if isObject(data.get('components')) and isArray(data['components'].get('data')):
        for component in data['components']['data']:
            updateEntities(result, getEntities(component))
    return result


def isLinesParallel(lines, accurary=0.1):
    line0 = lines[0]
    for i in range(1, len(lines)):
        if (abs(line0.slope - lines[i].slope) > accurary):
            return False
    return True


class Line:
    def __init__(self, start, end):
        self.start = ezdxf.math.Vec2(start)
        self.end = ezdxf.math.Vec2(end)

    @property
    def slope(self):
        start = self.start
        end = self.end
        if start.x == end.x:
            return math.inf
        if start.y == end.y:
            return 0
        return (start.y-end.y)/(start.x-end.x)


def transformCadData(data, transformation):
    translate = transformation['translate']
    x = translate[0]
    y = translate[1]
    for id in data['entities']['line']:
        e = data['entities']['line'][id]
        e['start'][0] += x
        e['start'][1] += y
        e['end'][0] += x
        e['end'][1] += y
    for id in data['entities']['circle']:
        e = data['entities']['circle'][id]
        e['center'][0] += x
        e['center'][1] += y
    for id in data['entities']['arc']:
        e = data['entities']['arc'][id]
        e['center'][0] += x
        e['center'][1] += y

    for v in data['partners']:
        transformCadData(v, transformation)
    for v in data['components']['data']:
        transformCadData(v, transformation)


def getLinesAngle(x1, y1, x2, y2, x3, y3, x4, y4):
    if x1 == x2:
        theta1 = math.pi/2
    else:
        theta1 = math.atan((y1-y2)/(x1-x2))
    if x3 == x4:
        theta2 = math.pi/2
    else:
        theta2 = math.atan((y3-y4)/(x3-x4))
    return abs(theta2-theta1)
