# Android 原生徒步地图插件接口规范

## 目标

为 `uni-app` 徒步页提供一个可长期维护的 Android 原生徒步地图插件接口，满足：

- 真实地图显示
- 真实定位
- 真实海拔、精度、速度
- 真实轨迹记录与里程累计
- 地图模式切换
- 离线场景下继续 GPS 定位与轨迹记录
- 离线地形/等高线地图包切换
- 徒步安全能力扩展

地图底图建议调整为：

- 在线地形底图：天地图
- 离线地形底图：天地图地形瓦片包或预制等高线瓦片包
- 定位来源：Android 原生 GPS / GNSS，必要时结合系统融合定位能力兜底

当前前端桥接入口已经预留在：

- `services/hiking-native.js`

推荐原生插件名：

- `MeetXinjiangHikingMap`

## 插件职责边界

### 原生插件负责

- 天地图底图初始化与销毁
- 地图模式切换
- 高精度定位
- 无网络时继续使用 GPS / GNSS 定位
- 连续轨迹记录
- 里程累计
- 海拔/速度/精度读取
- 离线地图包与离线等高线图层管理
- 原生事件回传

### uni-app 前端负责

- UI 展示
- 页面交互
- SOS / 守护模式流程
- 将原生回传数据映射到页面组件

## 前端调用方式

前端通过：

```js
const plugin = uni.requireNativePlugin('MeetXinjiangHikingMap')
```

调用原生方法。

建议所有方法都返回统一结构：

```json
{
  "success": true,
  "code": "OK",
  "message": "",
  "data": {}
}
```

失败时：

```json
{
  "success": false,
  "code": "LOCATION_PERMISSION_DENIED",
  "message": "定位权限被拒绝",
  "data": null
}
```

## 方法列表

## 1. initMap

初始化原生徒步地图容器、天地图底图能力与定位能力。

### 请求参数

```json
{
  "mode": "normal",
  "provider": "tianditu",
  "zoom": 15,
  "showCompass": true,
  "showScale": false,
  "enableLocation": true,
  "enableTrack": false,
  "allowGpsOffline": true,
  "offlineTerrainEnabled": true
}
```

### 字段说明

- `mode`: 地图模式，可选值 `normal` / `satellite` / `terrain`
- `provider`: 底图提供方，第一版固定建议为 `tianditu`
- `zoom`: 初始缩放级别
- `showCompass`: 是否显示罗盘
- `showScale`: 是否显示比例尺
- `enableLocation`: 是否开启定位蓝点
- `enableTrack`: 初始化时是否进入轨迹模式
- `allowGpsOffline`: 无网络时仍允许 GPS 定位
- `offlineTerrainEnabled`: 是否启用离线地形图能力

### 返回示例

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "nativeReady": true,
    "provider": "tianditu",
    "locationProvider": "android-gps",
    "version": "1.0.0"
  }
}
```

## 2. destroyMap

销毁地图、监听器、定位客户端。

### 请求参数

无

### 返回示例

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "destroyed": true
  }
}
```

## 3. getCurrentLocation

获取当前一次定位结果。

### 请求参数

```json
{
  "highAccuracy": true,
  "timeout": 10000,
  "allowGpsOffline": true,
  "preferGpsWhenOffline": true
}
```

### 返回 data

```json
{
  "latitude": 43.825419,
  "longitude": 86.947216,
  "altitude": 3248.3,
  "accuracy": 4.2,
  "speed": 1.6,
  "bearing": 48,
  "timestamp": 1713333000000,
  "provider": "gps",
  "networkRequired": false
}
```

## 4. moveToCurrentLocation

地图回到当前位置。

### 请求参数

```json
{
  "zoom": 16,
  "animate": true
}
```

### 返回 data

```json
{
  "moved": true
}
```

## 5. setMapMode

切换地图模式。

### 请求参数

```json
{
  "mode": "satellite",
  "provider": "tianditu"
}
```

### 可选值

- `normal`: 标准地图
- `satellite`: 卫星图
- `terrain`: 徒步增强模式

其中 `terrain` 必须支持户外场景下的地形增强表达，优先级为：

1. 天地图地形底图与注记
2. 离线等高线瓦片包
3. 路线、危险点、补给点叠加层

### terrain 的建议实现

如果单一在线底图无法直接提供完整专业地形图，`terrain` 建议实现为：

- 天地图地形图或影像图
- 离线等高线瓦片或栅格包
- 罗盘开启
- 蓝点跟随
- 路线折线高亮
- 危险点高亮
- 补给点高亮

也就是“徒步增强模式”，而不强依赖某个单一 SDK 必须内建官方等高线底图。

### 返回 data

```json
{
  "mode": "terrain",
  "applied": true
}
```

## 6. startTrack

开始连续轨迹记录。

### 请求参数

```json
{
  "intervalMs": 5000,
  "distanceFilterMeters": 3,
  "highAccuracy": true,
  "allowGpsOffline": true,
  "persistOffline": true
}
```

### 字段说明

- `intervalMs`: 采样间隔，建议 3000-10000
- `distanceFilterMeters`: 位置变化阈值，小于该距离可忽略点
- `highAccuracy`: 是否高精度模式
- `allowGpsOffline`: 无网络时是否继续用 GPS 采样
- `persistOffline`: 离线状态下是否继续落本地轨迹缓存

### 返回 data

```json
{
  "tracking": true,
  "startedAt": 1713333000000
}
```

## 7. stopTrack

停止连续轨迹记录。

### 请求参数

无

### 返回 data

```json
{
  "tracking": false,
  "stoppedAt": 1713339000000
}
```

## 8. clearTrack

清空当前原生轨迹缓存。

### 请求参数

无

### 返回 data

```json
{
  "cleared": true
}
```

## 9. getTrackSummary

获取轨迹汇总数据。

### 请求参数

无

### 返回 data

```json
{
  "distanceKm": 12.84,
  "durationSec": 18240,
  "ascentMeters": 986,
  "descentMeters": 612,
  "pointCount": 248,
  "tracking": true,
  "startedAt": 1713333000000,
  "updatedAt": 1713339000000
}
```

## 10. getTrackPoints

获取轨迹点序列。

### 请求参数

```json
{
  "limit": 500
}
```

### 返回 data

```json
{
  "points": [
    {
      "latitude": 43.825419,
      "longitude": 86.947216,
      "altitude": 3248.3,
      "accuracy": 4.2,
      "speed": 1.6,
      "bearing": 48,
      "timestamp": 1713333000000
    }
  ]
}
```

## 11. setDangerMarkers

设置危险点覆盖物。

### 请求参数

```json
{
  "markers": [
    {
      "id": "risk-1",
      "latitude": 43.826,
      "longitude": 86.945,
      "title": "落石区",
      "level": "high"
    }
  ]
}
```

## 12. setSupplyMarkers

设置补给点、营地、避难点。

### 请求参数

```json
{
  "markers": [
    {
      "id": "supply-1",
      "latitude": 43.829,
      "longitude": 86.951,
      "title": "补水点",
      "type": "water"
    }
  ]
}
```

## 13. getOfflineMapStatus

获取离线地图与离线等高线包状态。

### 请求参数

无

### 返回 data

```json
{
  "baseMapReady": true,
  "terrainPackReady": true,
  "provider": "tianditu",
  "terrainPackVersion": "xj-hiking-v1",
  "lastUpdatedAt": 1713333000000
}
```

## 14. preloadOfflineTerrain

下载或校验离线徒步地形包。

### 请求参数

```json
{
  "regionId": "xj-tianshan-north",
  "includeContour": true,
  "includeRiskOverlay": true
}
```

### 返回 data

```json
{
  "started": true,
  "regionId": "xj-tianshan-north"
}
```

## 事件设计

插件应支持向前端持续派发事件。

推荐事件名如下：

## 1. onLocationChange

定位更新时触发。

### payload

```json
{
  "latitude": 43.825419,
  "longitude": 86.947216,
  "altitude": 3248.3,
  "accuracy": 4.2,
  "speed": 1.6,
  "bearing": 48,
  "timestamp": 1713333000000
}
```

## 2. onTrackUpdate

轨迹累计更新时触发。

### payload

```json
{
  "distanceKm": 12.84,
  "pointCount": 248,
  "updatedAt": 1713339000000
}
```

## 3. onGpsWeak

定位精度过差时触发。

### payload

```json
{
  "accuracy": 68,
  "message": "当前 GPS 信号较弱"
}
```

## 4. onDeviationAlert

偏离预设轨迹时触发。

### payload

```json
{
  "distanceFromRouteMeters": 137,
  "message": "已偏离建议路线"
}
```

## 5. onNativeError

原生异常时触发。

### payload

```json
{
  "code": "MAP_PROVIDER_ERROR",
  "message": "地图 SDK 初始化失败"
}
```

## 6. onOfflineMapReady

离线地图或离线等高线包可用时触发。

### payload

```json
{
  "baseMapReady": true,
  "terrainPackReady": true,
  "regionId": "xj-tianshan-north"
}
```

## 错误码建议

- `OK`
- `UNKNOWN_ERROR`
- `INIT_FAILED`
- `MAP_NOT_READY`
- `LOCATION_FAILED`
- `LOCATION_PERMISSION_DENIED`
- `GPS_DISABLED`
- `TRACK_NOT_STARTED`
- `INVALID_ARGUMENT`
- `MAP_PROVIDER_ERROR`
- `OFFLINE_TERRAIN_PACK_MISSING`
- `OFFLINE_TERRAIN_PACK_CORRUPTED`

## 原生里程计算规则

里程不要由前端算，建议完全由原生维护。

### 规则

1. 每次新定位点到达时计算与上一个有效点的距离
2. 小于 `distanceFilterMeters` 的抖动点不计入
3. 精度超过阈值的点可选择丢弃，例如 `accuracy > 50m`
4. 将有效距离累加成 `distanceKm`

## 原生海拔规则

海拔直接使用原生定位返回 `altitude`。

### 注意

- 如果海拔无效，返回 `0` 或 `null`
- 不要让前端猜测海拔

## 离线 GPS 规则

无网络时必须保证：

1. 不依赖网络定位
2. 继续使用手机 GPS / GNSS 芯片定位
3. 继续返回经纬度、海拔、精度、速度
4. 继续记录轨迹到本地缓存
5. 网络恢复后允许前端主动同步轨迹

这意味着：

- 离线时地图底图可以降级
- 但定位、轨迹、海拔、里程不能失效

## 离线地形/等高线图策略

这是徒步安全的关键要求，建议原生侧实现以下策略：

### 在线时

- 优先使用天地图在线矢量/影像/地形底图
- 根据模式叠加注记、路线、风险点、补给点图层

### 离线时

- 加载提前下载的离线地形包
- 离线地形包至少包含：
  - 基础地图瓦片
  - 等高线瓦片或栅格图
  - 风险点叠加数据
  - 补给点叠加数据

### terrain 模式最低要求

即使没有完美的官方地形图，也应达到：

- 可见路线
- 可见海拔/等高线表达
- 可见危险区域
- 可见补给点
- 可见当前位置

也就是说，`terrain` 模式必须是“可用于徒步安全”的模式，而不是简单改个颜色。

## 前端桥接建议

当前前端桥接文件：

- `services/hiking-native.js`

下一步建议将其扩展为：

- 支持统一响应解包
- 支持事件监听/取消监听
- 支持原生失败后自动回退到 `services/amap.js`
- 支持离线 GPS 模式标记
- 支持离线地形包状态查询

## 建议的前端调用流程

### 页面进入

1. `initMap`
2. `getCurrentLocation`
3. 更新顶部海拔/精度/坐标
4. `getOfflineMapStatus`

### 点击开始记录

1. `startTrack`
2. 周期性或事件式接收 `onLocationChange`
3. 周期性或事件式接收 `onTrackUpdate`

### 点击切换地图模式

1. `setMapMode('normal' | 'satellite' | 'terrain')`

### 无网络时

1. 自动进入离线 GPS 模式
2. 若存在离线地形包，则 `terrain` 模式继续可用
3. 若不存在离线地形包，则提示提前下载

### 点击回到当前位置

1. `moveToCurrentLocation`

### 页面销毁

1. `stopTrack`（如有需要）
2. `destroyMap`

## Android 实现建议

### SDK 建议

- Android 原生定位能力（LocationManager / FusedLocationProvider 或兼容实现）
- 支持瓦片底图加载的原生地图容器或 WebView + 原生桥接方案
- 天地图瓦片接入能力
- 本地瓦片缓存/离线包管理能力

### 原生内部建议模块

- `HikingMapManager`
  - 地图对象管理
- `HikingLocationManager`
  - 定位管理
- `HikingTrackManager`
  - 轨迹点缓存、里程计算、汇总输出
- `HikingOfflineTerrainManager`
  - 离线地图包、等高线包、风险叠加层管理
- `HikingEventEmitter`
  - 给 uni-app 发事件

这样原生侧也保持高内聚低耦合。

## 最小可交付版本

第一版原生插件至少实现：

1. `initMap`
2. `destroyMap`
3. `getCurrentLocation`
4. `moveToCurrentLocation`
5. `setMapMode`
6. `startTrack`
7. `stopTrack`
8. `getTrackSummary`
9. `getOfflineMapStatus`

这样就已经可以打通：

- 真地图
- 真海拔
- 真里程
- 真轨迹
- 地图模式切换
- 离线 GPS 定位
- 离线地形模式

## 与当前前端代码对应关系

当前前端已预留：

- `pages/hiking/index.vue`
- `services/hiking-native.js`
- `common/hiking-metrics.js`

接入原生插件后，优先使用原生返回的：

- 海拔
- 精度
- 里程
- 轨迹汇总

前端本地计算逻辑继续保留为兜底。

## 下一步建议

建议下一步直接做两件事：

1. 在 `services/hiking-native.js` 中补充统一响应解包和事件监听封装
2. 按本规范开始 Android 原生插件开发，并优先打通天地图底图 + GPS/GNSS + 离线地形包
