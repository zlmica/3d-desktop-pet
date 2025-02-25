import { BasicShadowMap, NoToneMapping, SRGBColorSpace, Vector3 } from 'three'
import { ref } from 'vue'

export const useTres = () => {
  const gl = {
    shadows: false,
    alpha: true,
    premultipliedAlpha: false,
    antialias: true,
    shadowMapType: BasicShadowMap,
    outputColorSpace: SRGBColorSpace,
    toneMapping: NoToneMapping,
    windowSize: true,
  }

  // 灯光设置 默认
  const light = ref({
    color: '#ffffff',
    position: new Vector3(0, 4, 3),
    intensity: 1.8,
  })

  // 相机设置 默认
  const camera = ref({
    position: new Vector3(0, 0, 4),
    // fov: 45,
    // near: 0.1,
    // far: 1000,
  })
  // 环境光
  const ambientLight = ref({
    color: '#ffffff',
    intensity: 2,
  })

  // 设置配置
  const setConfig = (config: any) => {
    if (config.directLight) {
      light.value.intensity = config.directLight.intensity
      light.value.color = config.directLight.color
      light.value.position.set(
        config.directLight.position.x,
        config.directLight.position.y,
        config.directLight.position.z
      )
    }

    if (config.camera) {
      camera.value.position.set(
        config.camera.position.x,
        config.camera.position.y,
        config.camera.position.z
      )
    }

    if (config.ambientLight) {
      ambientLight.value.intensity = config.ambientLight.intensity
      ambientLight.value.color = config.ambientLight.color
    }

    if (window.ipcRenderer) {
      const serializedConfig = {
        directLight: {
          intensity: light.value.intensity,
          color: light.value.color,
          position: {
            x: light.value.position.x,
            y: light.value.position.y,
            z: light.value.position.z,
          },
        },
        camera: {
          position: {
            x: camera.value.position.x,
            y: camera.value.position.y,
            z: camera.value.position.z,
          },
        },
        ambientLight: {
          intensity: ambientLight.value.intensity,
          color: ambientLight.value.color,
        },
      }
      window.ipcRenderer.send('update-scene-settings', serializedConfig)
    }
  }

  return {
    gl,
    light,
    camera,
    ambientLight,
    setConfig,
  }
}
