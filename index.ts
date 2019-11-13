type StopHandle = () => void

interface Ref<T> {
  value: T
}

type WatcherSource<T> = Ref<T> | (() => T)

interface IVueNextAPI {
  createApp: () => {
    mount: (appEl: object, selector: string) => void
  }

  reactive: <T extends object>(raw: T) => T

  computed: <T extends object>(raw: T) => T

  watch<T>(
    source: WatcherSource<T>,
    effect: (value: T, oldValue: T) => void
  ): StopHandle
}

declare global {
  interface Window {
    Vue: IVueNextAPI
  }
}

interface InfoProps {
  count: string
  message: string
  notifications: Array<{ id: number; content: string }>
  increment: () => void
  stop: () => void
}

const Info = {
  setup(props: InfoProps) {
    return props
  },

  template: `
    <div>
      <h3>Info</h3>
      <div>{{ message }}</div>
      <div>Count is: {{ count }}</div>
      <button @click="increment">Increment</button>

      <h4>Notifications</h4>
      <button @click="stop">Stop</button>
      <ul>
        <li v-for="notification in notifications" :key="notification.id">
          {{ notification.content }}
        </li>
      </ul>
    </div>
  `
}

interface State {
  count: number
  notifications: Array<{ id: number; content: string }>
}

interface AppSetup {
  state: State
  message: () => string
  increment: () => void
  stop: () => void
}

const App = {
  components: {
    Info
  },

  setup(): AppSetup {
    const state: State = window.Vue.reactive({
      count: 0,
      notifications: []
    })

    const increment = () => {
      state.count += 1
    }

    const stop = window.Vue.watch(
      () => state.count,
      (val, oldVal) => {
        state.notifications.push({
          id: state.notifications.length + 1,
          content: `${oldVal} => ${val}`
        })
      }
    )

    return {
      state,
      increment,
      stop,
      message: window.Vue.computed(() => `Count is: ${state.count}`)
    }
  },

  template: `
    <Info 
      :count="state.count"
      :notifications="state.notifications"
      :message="message"
      :increment="increment"
      :stop="stop"
    />
  `
}

window.addEventListener('DOMContentLoaded', () => {
  window.Vue.createApp().mount(App, '#app')
})

export {}
