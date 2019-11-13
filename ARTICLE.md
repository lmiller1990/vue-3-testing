In this article we compile Vue 3 from the latest source and try out some of the new APIs, include the upcoming composition API. This is the app we will be building:

GIF_1

First, cloned the `vue-next` repo: `git clone https://github.com/vuejs/vue-next.git`. Now, `cd vue-next` and install the dependencies by running `yarn install`, then build the packages by running `yarn build`. This might take a while.

Next, we need a minimal `index.ts` and `index.html`. `index.html` looks like this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
  <script src="./packages/vue/dist/vue.global.js"></script>
  <script src="./dist/bundle.js"></script>
</head>
<body>
  <div id="app"></div> 
</body>
</html>
```

We have added two script tags - one for the `./dist/bundle.js` we will be compiling soon, and one for the browser build of Vue 3, which was compiled when we ran `yarn build` in the `packages/vue/dist/vue.global.js` directory.

Next, add a basic `index.ts`:

And `index.ts`:

```ts
export {}
```

Since we will use TypeScript, we will need a few dependencies and a basic `webpack.config.js` to compile for use in a browser. Install them:

```sh
yarn add yarn add awesome-typescript-loader source-map-loader webpack-cli webpack -W
```

We need `-W` since we are currently are in a git repository containing several sub packages (in the `packages` directory, `vue-next` is very modular like that) and we want to install the dependencies to the top level. We will piggyback of the existing `tsconfig.json` - but we don't want to watch the entire repository during development, since we have already built the project when we ran `yarn build` earlier. In the existing `tsconfig.json`, remove all the entires in the `"include"` array. 

Next, I created a `webpack.config.js` and added the following:

```js
const path = require('path')
const { CheckerPlugin } = require('awesome-typescript-loader')

module.exports = {
  entry: './index.ts',
  devtool: 'source-map',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.ts/,
        exclude: /node_modules/,
        loader: 'awesome-typescript-loader'
      },
      { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [new CheckerPlugin()]
}
```

Okay, now we are ready to start hacking. I had bit of trouble getting everything to work - I was really hoping to import a bunch of TypeScript methods and get autocompletion out of the box, but either I didn't build the packages right or I'm missing something, or it's just too early for that in development of Vue 3. So we will need some type definitions. The TypeScript experience is, to me, the killer feature of Vue 3, not the new APIs or other features.

Start by updaing `index.ts` with the following:

```ts
interface IVueNextAPI {
  createApp: () => {
    mount: (appEl: object, selector: string) => void
  }
}

declare global {
  interface Window {
    Vue: IVueNextAPI
  }
}

interface InfoProps {
  count: string
  message: string
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
    </div>
  `
}

interface AppSetup {
  count: number
}

const App = {
  components: {
    Info
  },

  setup(): AppSetup {
    return {
      count: 0
    }
  },

  template: `
    <Info 
      :count="count"
      message="Hello from Vue 3"
    />
  `
}

window.addEventListener('DOMContentLoaded', () => {
  window.Vue.createApp().mount(App, '#app')
})

export {}
```

I tried using the definitions generated during the `yarn build` step earlier, but I couldn't get it working - TS errors everywhere, so for now I just made some minimal types to get us started. We no longer do `const app = new Vue(....).$mount('#app')` anymore - Vue 3 exposes a `createApp` function, which returns a `mount` method to which you pass your root component and selector. 

Ideally, we would use `tsx` in `render` functions, however I couldn't get that working either, so for now I'll just use string literals with `template`. In the future, `tsx` and render functions will be supported, and we should be able to get static typechecking on our templates, like in React when using `tsx`! 

You can see there is now a `setup` function, which takes the props as the first argument, as shown in the `Info` component. Since `App` is the top level component, it does not receive any props. `setup` returns and object which is what would be saved in `data` and `computed` fields in the current Vue 2 API. This will still be an option in Vue 3, as well. 

Whatever you return from `setup` are made available in the `template` function. I like to define this object as `XXXSetup`, where `XXX` is the name of component. It's like a schema for your component; it tells the developer what the setup function's API looks like. Think of it like a form a documentation.

`setup` is called once, when the component is created for the first time (like the existing `created` lifecycle method). The above code renders the following entirely uninteresting Vue app:

SS_1

Let's explore some more of the new APIs.

## Using `reactive`

Vue now exposes a `reactive` method. This lets us make any object... reactive. The type definition looks like this, taken from [here](https://vue-composition-api-rfc.netlify.com/api.html#reactive):

```ts
interface IVueNextAPI {
  createApp: () => {
    mount: (appEl: object, selector: string) => void
  }

  reactive: <T extends object>(raw: T) => T
}
```

We can update the `setup` function in `App` using the new `reactive` function. `reactive` takes an object - count is a primitive. You can use another new API, `ref`, for primitive values, but for now let's use `reactive` with a `count` key. This will make it easy to add more reactive properties soon. They are actually slightly difference, you can read more [here in the RFC](https://vue-composition-api-rfc.netlify.com/#ref-vs-reactive).

Update `App`:

```ts
interface AppSetup {
  state: {
    count: number
  }
  increment: () => void
}

const App = {
  components: {
    Info
  },

  setup(): AppSetup {
    const state = window.Vue.reactive({ count: 0 })

    const increment = () => {
      state.count += 1
    }

    return {
      state,
      increment
    }
  },

  template: `
    <Info 
      :count="state.count"
      message="Hello from Vue 3"
      :increment="increment"
    />
  `
}
```

Next, update `Info` to use the new `increment` function:

```ts
interface InfoProps {
  count: string
  message: string
  increment: () => void
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
    </div>
  `
}
```

Clicking the `increment` updates the `count`, using Vue's mutation based update logic. Next I'll show how to use the `computed` API.

## `computed`

Let's say we want the `message` prop to be dynamic, based on the value of `count`. We can use `computed`. Update the type definition, which in it's basic form is the same as `reactive`. Also update `App`:

```ts
interface AppSetup {
  state: {
    count: number
  }
  message: () => string
  increment: () => void
}

const App = {
  components: {
    Info
  },

  setup(): AppSetup {
    const state = window.Vue.reactive({ 
      count: 0,
    })

    const increment = () => {
      state.count += 1
    }

    return {
      state,
      increment,
      message: window.Vue.computed(() => `Count is: ${state.count}`)
    }
  },

  template: `
    <Info 
      :count="state.count"
      :message="message"
      :increment="increment"
    />
  `
}
```

At first I tried to do `message: `Count is ${state.count}`. That does not work. `setup` only runs once - you will just get a string that does _not_ update reatively. You need to pass a `computed` function. This lets Vue keep track of the changes.

SS_2

## `watch`

Now we have two count messages that increment together. Let's take a look at another familiar API from Vue 2, `watch`. There are quite a few type overloads if you dig deep into the repo, I'll just demonstrate the simplest here.

```ts
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
    effect: (
      value: T,
      oldValue: T,
    ) => void,
  ): StopHandle
}
```

`watch` now returns a `stop` function, which you can call to cancel the watching. It's a bit easier to understand once you see it in action. I'll also add a bit more type safety to the `AppSetup`:

```ts
interface State {
  count: number
  notifications: Array<{ id: number, content: string }>
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

    const stop = window.Vue.watch(() => state.count, (val, oldVal) => {
      state.notifications.push(
        {
          id: state.notifications.length + 1,
          content: `${oldVal} => ${val}`
        }
      )
    })


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
```

`watch`, takes a function, which should reutrn the `reactive` object to watch. The next argument is a callback which is called when the watched value mutates. The callback receives the newly updated value and the previous value, just as it does in Vue 2. 

In the body of the callback, you implement whatever you want to occur when the value changes. In this case, I push to an array, showing how the value changed. `watch` returns a function which I called `stop`. When you call `stop`, the watcher will cease to watch the values.

The updated `Info` implementation using `stop` and displaying `notifications` is as follows:

```ts
interface InfoProps {
  count: string
  message: string
  notifications: Array<{ id: number, content: string }>
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
```

SS_3

This is a pretty basic app, but it does a good job of showing of the new Vue 3 composition API.

## Thoughts

The new composition API RFC has received mixed feedback from the community. One thing I think is important to remember is the composition API is additive - none of the existing Vue 2 APIs is going away. Here are some of nice things about it, and Vue 3 in general:

- The entire codebase is in TypeScript, which means we get better type checking and assistance from the IDE.
- The composition API allows for better Typescript support. I think this is the real killer feature - I don't have a strong opinion on which API I like better, I just want to have type safety so I can build bug free applications and deliver value to clients.
- It is certainly a departure from what I first liked about Vue - simple and seemingly "magic" reactivity.
- Good support for `tsx` - not my preferred way to write templates, but if it means better type safety, I'll take it.

Some of the cons are:

- Two ways to write Vue components - just because you know one Vue app well, another might be completely different. This is kind of how I feel about React now. Some codebases use `class` component with lifecycle methods, and other use `function` components with the new React hooks. It's a bit tiring to learn so many ways to do the same thing.
- likely more work to write a plugin supporting two different APIs.
- You need to learn something new. If you don't like learning new things, you probably don't belong in the modern JS world anyway. Not sure if this is a good or bad thing :shrug:

## Conclusion

We explored the new composition API and Vue 3 by compiling it from source. Exciting times are ahead!