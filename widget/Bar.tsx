import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable } from "astal"
import { execAsync } from "astal/process"

const padding = 10

// const time = Variable("").poll(1000, "date")

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  const monitor_geometry = gdkmonitor.get_geometry()
  const monitor_height = monitor_geometry.height
  const monitor_width = monitor_geometry.width

  const prompt_text = Variable("")
  const mode_label = Variable("󰗊")

  const results_content = Variable("Placeholder")

  let callback_handle = null

  let result_counter = 0
  let number_of_pending_asyncs = 0

  return <window
  className="Spotlight"
  gdkmonitor={gdkmonitor}
  exclusivity={Astal.Exclusivity.IGNORE}
  // anchor={TOP}
  // css="background: green;"
  // keymode={Astal.Keymode.EXCLUSIVE}
  onKeyPressEvent={function (self, event: Gdk.Event) {
    // ---------- exit ----------
    if(event.get_keyval()[1] === Gdk.KEY_Escape)
      App.quit()
  }}
  keymode={Astal.Keymode.ON_DEMAND}
  application={App}>
    <box className="vertical-box" vertical widthRequest={monitor_width * 0.5}>
      <box className="prompt-box" spacing={padding}>
        <centerbox className="mode">
          <label label={mode_label()}></label>
        </centerbox>
        <centerbox className="text">
          <label label="en  cs"></label>
        </centerbox>
        <entry
        placeholderText="Search"
        enableEmojiCompletion={true}
        text={prompt_text()}
        onChanged={self => {
          prompt_text.set(self.text)
          // ---------- trans ----------
          if(callback_handle)
            clearTimeout(callback_handle)
          if(prompt_text.get()) {
            callback_handle = setTimeout(() => {
              let text_to_translate = prompt_text.get()
              let result_id = ++result_counter;
              number_of_pending_asyncs++
              execAsync(['trans', 'en:cs', text_to_translate])
                .then((out) => {
                  number_of_pending_asyncs--
                  let should_quit = result_id < result_counter
                  if(number_of_pending_asyncs == 0) // reset result counter
                    result_counter = 0
                  if(should_quit)
                    return
                  let out_formatted = out.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') // remove ansi escape characters
                  results_content.set(out_formatted)
                })
                .catch((err) => printerr(err))
            }, 100)
          }
          else {
            result_counter++
            results_content.set("")
          }
        }}
        ></entry>
      </box>
      <box className="gap"></box>
      <box className="result-box">
        <scrollable hexpand={true} vexpand={true}>
          <label className="output" label={results_content()} xalign={0} yalign={0} wrap selectable></label>
        </scrollable>
      </box>
    </box>
  </window>
}
/*
  <centerbox>
<button
onClicked="echo hello"
halign={Gtk.Align.CENTER}
>
Welcome to AGS!
</button>
<box />
<button
onClicked={() => print("hello")}
halign={Gtk.Align.CENTER}
>
<label label={time()} />
</button>
</centerbox>
*/
