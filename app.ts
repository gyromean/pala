import { App } from "astal/gtk3"
import style from "./style.scss"
import Bar from "./widget/Bar"

App.start({
  css: style,
  main() {
    App.get_monitors().map(Bar)
  },
  requestHandler(request, res) {
    if(request == "show") {
      App.get_window("spotlight").show()
    }
  },
})
