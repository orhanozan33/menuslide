' Runs on task thread. Sends heartbeat and fetches version.
sub Run()
    inp = m.top.input
    if inp = invalid then
        m.top.result = { error: true }
        return
    end if
    token = inp.deviceToken
    if token = invalid then token = ""
    if token = "" then
        m.top.result = { error: true }
        return
    end if
    base = "https://menuslide.com/api"
    port = CreateObject("roMessagePort")
    ' Heartbeat POST (fire and forget style - we don't wait)
    reqHb = CreateObject("roUrlTransfer")
    reqHb.setUrl(base + "/device/heartbeat")
    reqHb.setRequest("POST")
    reqHb.addHeader("Content-Type", "application/json")
    reqHb.setPort(port)
    reqHb.asyncPostFromString(FormatJson({ deviceToken: token }))
    ' Version GET (cache-buster so Roku always gets current layoutVersion)
    xfer = CreateObject("roUrlTransfer")
    ts = Str(CreateObject("roDateTime").AsSeconds())
    url = base + "/device/version?deviceToken=" + xfer.Escape(token) + "&_=" + ts
    req = CreateObject("roUrlTransfer")
    req.setUrl(url)
    req.setRequest("GET")
    req.addHeader("X-Device-Token", token)
    req.setMinimumTransferRate(1024, 3)
    req.setPort(port)
    versionResp = invalid
    ok = req.asyncGetToString()
    if ok
        msg = wait(10000, port)
        if type(msg) = "roUrlEvent" and msg.getResponseCode() = 200
            versionResp = ParseJson(msg.getString())
        end if
    end if
    if versionResp <> invalid and versionResp.error = invalid then
        m.top.result = versionResp
    else
        m.top.result = { error: true }
    end if
end sub
