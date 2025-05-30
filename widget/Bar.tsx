import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { bind, Variable } from "astal"
import { execAsync } from "astal/process"

const padding = 10

enum Mode {
  App,
  Translate,
  Qalc,
}

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const monitor_width = gdkmonitor.get_geometry().width

  // ---------- refactored ----------

  const input_text = Variable("")
  const output_text = Variable("Placeholder ".repeat(1000))
  const mode = Variable(Mode.Qalc)
  const langs = Variable(["en", "cs"])

  let callback_handle = null
  let result_counter = 0
  let number_of_pending_asyncs = 0

  const get_mode_icon = () => {
    return bind(mode).as(mode_val => {
      switch(mode_val) {
        case Mode.App:
          // return '󱡁'
          return ''
        case Mode.Translate:
          return '󰗊'
        case Mode.Qalc:
          return ''
          return '󰪚'
          return ''
      }
    })
  }

  const swap_langs = () => {
    const [lang_from, lang_to] = langs.get()
    langs.set([lang_to, lang_from])
  }

  const make_args_translate = () => {
    let input_text_val = input_text.get()
    const [lang_from, lang_to] = langs.get()
    return ['trans', `${lang_from}:${lang_to}`, input_text_val]
  }

  const make_args_qalc = () => {
    let input_text_val = input_text.get()
    return ['qalc', input_text_val]
  }

  const enqueue_exec = () => {
    let make_args
    switch(mode.get()) {
      case Mode.App:
        make_args = make_args_translate // TODO:
        break
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
      }, 300)
    }
    else { // prompt text is empty
      result_counter++
      output_text.set("")
    }
  }

  const show_when = target_mode => {
    return s => {
      mode.subscribe(current_mode => {
        if(current_mode == target_mode)
          s.show()
        else
          s.hide()
      })
    }
  }

  function PromptBox(): JSX.Element {
    return <box className="prompt-box" spacing={padding}>
      <centerbox className="mode">
        <label label={get_mode_icon()}></label>
      </centerbox>

      <centerbox className="text" setup={show_when(Mode.Translate)}>
        <label label={bind(langs).as(([lang_from, lang_to]) => {
          print('zmena')
          return `${lang_from}  ${lang_to}`
        })}></label>
      </centerbox>

      <entry
      // placeholderText="Search"
      hexpand={true}
      enableEmojiCompletion={true}
      text={input_text()}
      onChanged={self => {
        print('changed')
        input_text.set(self.text)
        enqueue_exec()
      }}
      ></entry>
    </box>
  }

  // ---------- to refactor ----------

  return <window
  className="Spotlight"
  gdkmonitor={gdkmonitor}
  exclusivity={Astal.Exclusivity.IGNORE}
  onKeyPressEvent={function (self, event: Gdk.Event) {
    print('keypress')
    switch(event.get_keyval()[1]) {
      case Gdk.KEY_Tab:
        if(mode.get() == Mode.Translate)
          mode.set(Mode.Qalc)
        else
          mode.set(Mode.Translate)
        // swap_langs()
        // enqueue_exec()
        return true
        break
      case Gdk.KEY_Escape:
        App.quit()
        break
    }
  }}
  keymode={Astal.Keymode.ON_DEMAND}
  application={App}>
    <box className="vertical-box" vertical widthRequest={monitor_width * 0.5}>
      <PromptBox />
      <box className="gap"></box>
      <box className="result-box">
        <scrollable hexpand={true} vexpand={true}>
          <label className="output" label={output_text()} xalign={0} yalign={0} wrap selectable></label>
        </scrollable>
      </box>
    </box>
  </window>
}
        // <centerbox className="text" setup={self => mode.subscribe(val => {print('skrr'); val == Mode.Translate ? self.show() : self.hide();})}>
