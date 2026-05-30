import { App } from "astal/gtk3"
import style from "./style.scss"
import Launcher from "./widget/Launcher"
import Hyprland from "gi://AstalHyprland"
import { execAsync } from "astal/process"

const hyprland = Hyprland.get_default()
let monitor_signature: string | null = null
let restart_timeout: ReturnType<typeof setTimeout> | null = null
let restart_requested = false

const by_position = (a, b) => {
  const ay = a.y ?? a.get_geometry?.().y ?? 0
  const by = b.y ?? b.get_geometry?.().y ?? 0
  const ax = a.x ?? a.get_geometry?.().x ?? 0
  const bx = b.x ?? b.get_geometry?.().x ?? 0

  if(ax !== bx)
    return ax - bx
  return ay - by
}

const physical_hypr_monitors = () => hyprland.get_monitors()
  .filter(monitor => !monitor.name.startsWith("HEADLESS-"))
  .sort(by_position)

const physical_gdk_monitors = () => {
  const gdk_monitors = App.get_monitors().sort(by_position)
  const hypr_monitors = physical_hypr_monitors()
  const matching_monitors = gdk_monitors.filter(gdk_monitor => {
    const geometry = gdk_monitor.get_geometry()
    return hypr_monitors.some(hypr_monitor =>
      hypr_monitor.x === geometry.x &&
      hypr_monitor.y === geometry.y &&
      hypr_monitor.width === geometry.width &&
      hypr_monitor.height === geometry.height
    )
  })

  if(matching_monitors.length === hypr_monitors.length)
    return matching_monitors

  return gdk_monitors.slice(0, hypr_monitors.length)
}

const window_name = (index: number) => `spotlight-${index}`

const physical_monitor_signature = () => {
  return physical_hypr_monitors()
    .map(monitor => `${monitor.id}:${monitor.name}:${monitor.x}:${monitor.y}:${monitor.width}x${monitor.height}`)
    .join("|")
}

const focused_window_name = () => {
  const focused = hyprland.get_focused_monitor()
  const gdk_monitors = physical_gdk_monitors()

  if(gdk_monitors.length === 0)
    return null

  if(focused && !focused.name.startsWith("HEADLESS-")) {
    const index = physical_hypr_monitors().findIndex(monitor => monitor.id === focused.id)
    if(index >= 0 && index < gdk_monitors.length)
      return window_name(index)
  }

  return window_name(0)
}

const show_launcher = () => {
  const name = focused_window_name()
  if(name === null) {
    printerr("[pala] no physical GDK monitor available")
    return false
  }

  const window = App.get_window(name)
  if(!window) {
    printerr(`[pala] no launcher window named ${name}`)
    return false
  }

  print(`[pala] show ${name}`)
  window.show()
  return true
}

const restart_pala = (reason: string) => {
  if(restart_requested)
    return

  restart_requested = true
  print(`[pala] restart: ${reason}`)
  execAsync([
    "bash",
    "-lc",
    'setsid bash -lc \'sleep 0.7; exec pala > "${XDG_RUNTIME_DIR:-/tmp}/pala.log" 2>&1\' >/dev/null 2>&1 &',
  ]).catch(logError)
  setTimeout(() => App.quit(), 50)
}

const schedule_topology_check = () => {
  if(restart_timeout !== null)
    clearTimeout(restart_timeout)

  restart_timeout = setTimeout(() => {
    restart_timeout = null
    const next_signature = physical_monitor_signature()
    if(next_signature !== monitor_signature)
      restart_pala(`${monitor_signature} -> ${next_signature}`)
  }, 500)
}

monitor_signature = physical_monitor_signature()
for(const monitor of physical_hypr_monitors())
  print(`[pala] initial monitor ${monitor.id} ${monitor.name}`)

hyprland.connect("monitor-added", schedule_topology_check)
hyprland.connect("monitor-removed", schedule_topology_check)

App.start({
  instanceName: "pala",
  css: style,
  // first `pala` invocation starts the backend
  main() {
    physical_gdk_monitors().map((monitor, index) => Launcher(monitor, index))
  },
  // consequent `pala` invocations show the launcher
  client(message: (msg: string) => string, ...args: Array<string>) {
    message("show")
  },
  // calling `ags request show` -i pala` shows the launcher (might be faster then the method above, but is dependent on the `ags` executable)
  requestHandler(request, res) {
    if(request == "show") {
      res(show_launcher() ? "ok" : "error")
    }
  },
})
