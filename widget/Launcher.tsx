import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { bind, Variable } from "astal"
import { execAsync } from "astal/process"
import Apps from "gi://AstalApps"

const padding = 10

enum Mode {
  App,
  Translate,
  Qalc,
}

export default function Launcher(gdkmonitor: Gdk.Monitor) {
  const monitor_width = gdkmonitor.get_geometry().width
  const apps = new Apps.Apps()
  const window_name = "spotlight-" + gdkmonitor.get_geometry().x

  const input_text = Variable("")
  const output_text = Variable("")
  const mode = Variable(Mode.App)
  const langs = Variable(["en", "cs"])
  const app_index = Variable(0)

  const app_list = input_text(text => mode.get() == Mode.App ? apps.fuzzy_query(text) : [])
  const app_compound = Variable.derive([app_list, app_index], (a, b) => [a, b])

  app_list.subscribe(_ => app_index.set(0)) // reset index each time we update listed apps

  let callback_handle = null
  let result_counter = 0
  let number_of_pending_asyncs = 0

  const reset = () => {
    mode.set(Mode.App) // must be above input_text, otherwise app entries won't get rendered once the launcher is reopened
    input_text.set("")
    output_text.set("")
    langs.set(["en", "cs"])
    app_index.set(0)
  }

  const get_mode_icon = () => {
    return mode(mode_val => {
      switch(mode_val) {
        case Mode.App:
          // return '󱡁'
          return ''
        case Mode.Translate:
          return '󰗊'
        case Mode.Qalc:
          return ''
          // return '󰪚'
          // return ''
      }
    })
  }

  const finish = () => {
    App.get_window(window_name).hide()
    reset()
  }

  const swap_langs = () => {
    const [lang_from, lang_to] = langs.get()
    langs.set([lang_to, lang_from])
  }

  const make_args_translate = () => {
    let input_text_val = input_text.get()
    const [lang_from, lang_to] = langs.get()
    return ['trans', `${lang_from}:${lang_to}`, '--', input_text_val]
  }

  const make_args_qalc = () => {
    let input_text_val = input_text.get()
    return ['qalc', '--', input_text_val]
  }

  const enqueue_exec = () => {
    let make_args
    switch(mode.get()) {
      case Mode.Translate:
        make_args = make_args_translate
        break
      case Mode.Qalc:
        make_args = make_args_qalc
        break
    }
    if(callback_handle)
      clearTimeout(callback_handle)
    if(input_text.get()) { // prompt text is not empty
      callback_handle = setTimeout(() => {
        let result_id = ++result_counter;
        number_of_pending_asyncs++

        execAsync(make_args())

          .then((out) => {
            number_of_pending_asyncs--
            let should_quit = result_id < result_counter
            if(number_of_pending_asyncs == 0) // reset result counter
              result_counter = 0
            if(should_quit)
              return
            let out_formatted = out.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') // remove ansi escape characters
            output_text.set(out_formatted)
          })
          .catch((err) => printerr(err))
      }, 0)
    }
    else { // prompt text is empty
      result_counter++
      output_text.set("")
    }
  }

  const show_when = target_mode => {
    const f = self => {
      if(mode.get() == target_mode)
        self.show()
      else
        self.hide()
    }
    return self => {
      f(self)
      mode.subscribe(_ => {
        f(self)
      })
    }
  }

  const hide_when = target_mode => {
    const f = self => {
      if(mode.get() == target_mode)
        self.hide()
      else
        self.show()
    }
    return self => {
      f(self)
      mode.subscribe(_ => {
        f(self)
      })
    }
  }

  const shift_app_index = delta => {
    if(mode.get() !== Mode.App)
      return
    const index = app_index.get()
    if(delta < 0 && index > 0) {
      app_index.set(index - 1)
    }
    else if(delta > 0 && index < app_list.get().length - 1) {
      app_index.set(index + 1)
    }
  }

  const launch_app = () => {
    if(mode.get() !== Mode.App)
      return
    app_list.get()[app_index.get()].launch()
    finish()
  }

  function AppEntry({ app, index }: { app: Apps.Application, index: Number }): JSX.Element {
    const children = []
    children.push(<label label={app.name}></label>)
    let class_name = "app-entry"
    if(index == app_index.get())
      class_name += " selected"
    return <box className={class_name}>
      {children}
    </box>
  }

  const make_app_entries = () => {
    return app_compound(([list, _]) =>
      list.map((app, index) => <AppEntry app={app} index={index} />)
    )
  }

  function PromptBox(): JSX.Element {
    return <box className="prompt-box" spacing={padding}>
      <centerbox className="mode">
        <label label={get_mode_icon()}></label>
      </centerbox>

      <centerbox className="text" setup={show_when(Mode.Translate)}>
        <label label={langs(([lang_from, lang_to]) => {
          return `${lang_from}  ${lang_to}`
        })}></label>
      </centerbox>

      <entry
      // placeholderText="Search"
      hexpand={true}
      text={input_text()}
      onChanged={self => {
        input_text.set(self.text)
        if(mode.get() != Mode.App) {
          enqueue_exec()
        }
      }}
      ></entry>
    </box>
  }

  function ResultBox(): JSX.Element {
    return <box className="result-box">
      <scrollable hexpand={true} vexpand={true}>
        <box>
          <box className="app-list" vertical hexpand={true} spacing={padding} setup={show_when(Mode.App)}>
            {make_app_entries()}
          </box>
          <label className="output" label={output_text()} xalign={0} yalign={0} wrap selectable setup={hide_when(Mode.App)}></label>
        </box>
      </scrollable>
    </box>
  }

  const key_press_event = (self, event: Gdk.Event) => {
    const key = event.get_keyval()[1]
    // switch to another mode
    if(mode.get() == Mode.App && input_text.get() === "") {
      switch(key) {
        case Gdk.KEY_slash:
          mode.set(Mode.Translate)
          return true
        case Gdk.KEY_equal:
          mode.set(Mode.Qalc)
          return true
      }
    }
    let terminate_propagation = true
    // capture specific keys
    switch(key) {
      case Gdk.KEY_Tab:
        if(mode.get() == Mode.Translate) {
          swap_langs()
          enqueue_exec()
        }
        break
      case Gdk.KEY_Down:
        shift_app_index(1)
        break
      case Gdk.KEY_Up:
        shift_app_index(-1)
        break
      case Gdk.KEY_Return:
        launch_app()
        break
      case Gdk.KEY_Escape:
        finish()
        break
      default:
        terminate_propagation = false
        break
    }
    return terminate_propagation
  }

  return <window
  name={window_name}
  className="spotlight"
  gdkmonitor={gdkmonitor}
  exclusivity={Astal.Exclusivity.IGNORE}
  onKeyPressEvent={key_press_event}
  keymode={Astal.Keymode.ON_DEMAND}
  visible={false}
  application={App}>
    <box className="vertical-box" vertical widthRequest={monitor_width * 0.5}>
      <PromptBox />
      <box className="gap"></box>
      <ResultBox />
    </box>
  </window>
}
