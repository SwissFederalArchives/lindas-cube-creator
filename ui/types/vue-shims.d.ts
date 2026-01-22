import type { Router, RouteLocationNormalizedLoaded } from 'vue-router'
import type { Store } from 'vuex'
import type { RootState } from '../src/store/types'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $router: Router
    $route: RouteLocationNormalizedLoaded
    $store: Store<RootState>
  }
}
