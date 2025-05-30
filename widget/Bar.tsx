import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable } from "astal"

const padding = 10

// const time = Variable("").poll(1000, "date")

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  const monitor_geometry = gdkmonitor.get_geometry()
  const monitor_height = monitor_geometry.height
  const monitor_width = monitor_geometry.width

  const prompt_text = Variable("")
  const mode_label = Variable("󰗊")

  return <window
  className="Spotlight"
  gdkmonitor={gdkmonitor}
  exclusivity={Astal.Exclusivity.IGNORE}
  // anchor={TOP}
  // css="background: green;"
  // keymode={Astal.Keymode.EXCLUSIVE}
  onKeyPressEvent={function (self, event: Gdk.Event) {
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
        <entry
        placeholderText="Search"
        enableEmojiCompletion={true}
        text={prompt_text()}
        onChanged={self => prompt_text.set(self.text)}
        ></entry>
      </box>
      <box className="gap"></box>
      <box className="result-box"></box>
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
