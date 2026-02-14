' Runs on task thread. Fetches layout from API.
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
    xfer = CreateObject("roUrlTransfer")
    url = base + "/device/layout?deviceToken=" + xfer.Escape(token)
    port = CreateObject("roMessagePort")
    json = invalid
    for i = 0 to 2
        req = CreateObject("roUrlTransfer")
        req.setUrl(url)
        req.setRequest("GET")
        req.addHeader("X-Device-Token", token)
        req.setMinimumTransferRate(1024, 5)
        req.setPort(port)
        ok = req.asyncGetToString()
        if ok
            msg = wait(15000, port)
            if type(msg) = "roUrlEvent" and msg.getResponseCode() = 200
                rawJson = msg.getString()
                if rawJson <> invalid and Len(rawJson) > 10 then
                    json = ParseJson(rawJson)
                    if json <> invalid and json.error = invalid then
                        ' Ham string gecir - node field objesi kesebilir
                        m.top.result = { rawJson: rawJson }
                        return
                    end if
                end if
                exit for
            end if
        end if
        sleep(2000 + i * 3000)
    end for
    m.top.result = { error: true }
end sub
