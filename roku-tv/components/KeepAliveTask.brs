' Runs on task thread. Sends ECP Play keypress to prevent screensaver / TV ambient mode (127.0.0.1:8060).
sub Run()
    req = CreateObject("roUrlTransfer")
    req.setUrl("http://127.0.0.1:8060/keypress/Play")
    req.setRequest("POST")
    req.asyncPostFromString("")
    m.top.result = { done: true }
end sub
