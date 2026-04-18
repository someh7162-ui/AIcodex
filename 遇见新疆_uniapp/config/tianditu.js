export const TIANDITU_PROVIDER = 'tianditu'
export const TIANDITU_KEY = '58f4f23a5a026d8bc9f289c7156b0b1a'
export const DEFAULT_TERRAIN_REGION_ID = 'xj-tianshan-north'

export function hasTiandituKey() {
  return Boolean(TIANDITU_KEY) && !TIANDITU_KEY.includes('请在这里填入')
}

export const TIANDITU_LAYERS = {
  vector: {
    layer: 'vec_w',
    annotation: 'cva_w',
    label: '天地图矢量',
  },
  imagery: {
    layer: 'img_w',
    annotation: 'cia_w',
    label: '天地图影像',
  },
  terrain: {
    layer: 'ter_w',
    annotation: 'cta_w',
    label: '天地图地形',
  },
}
