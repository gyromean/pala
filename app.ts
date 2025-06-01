import { App } from "astal/gtk3"
import style from "./style.scss"
import Launcher from "./widget/Launcher"
import Hyprland from "gi://AstalHyprland"

const hyprland = Hyprland.get_default()

// is needed for showing launcher on the correct monitor
const make_id_to_name = () => {
  const gdk_monitors = App.get_monitors().map(m => m.get_geometry().x).sort((a, b) => a - b)
  const hypr_monitors = hyprland.get_monitors().map(m => [m.x, m.id]).sort((a, b) => a[0] - b[0])

  const ret = {}
  for(let i = 0; i < gdk_monitors.length; i++)
    ret[hypr_monitors[i][1]] = "spotlight-" + gdk_monitors[i]

  return ret
}

const id_to_name = make_id_to_name()

App.start({
  instanceName: "pala",
  css: style,
  // first `pala` invocation starts the backend
  main() {
    App.get_monitors().map(Launcher)
  },
  // consequent `pala` invocations show the launcher
  client(message: (msg: string) => string, ...args: Array<string>) {
    message("show")
  },
  // calling `ags request show` -i pala` shows the launcher (might be faster then the method above, but is dependent on the `ags` executable)
  requestHandler(request, res) {
    if(request == "show") {
      const hypr_id = hyprland.get_focused_monitor().id;
      const name = id_to_name[hypr_id]
      App.get_window(name).show()
      res("ok")
    }
  },
})
