import { App } from "astal/gtk3"
import style from "./style.scss"
import Bar from "./widget/Bar"
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
  css: style,
  main() {
    App.get_monitors().map(Bar)
  },
  requestHandler(request, res) {
    if(request == "show") {
      const hypr_id = hyprland.get_focused_monitor().id;
      const name = id_to_name[hypr_id]
      App.get_window(name).show()
    }
  },
})
