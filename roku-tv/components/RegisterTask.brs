' Runs on task thread so roUrlTransfer is allowed.
sub Run()
    inp = m.top.input
    if inp = invalid then
        m.top.result = { error: true }
        return
    end if
    code = inp.displayCode
    if code = invalid then code = ""
    id = inp.deviceId
    if id = invalid then id = ""
    if code = "" or id = "" then
        m.top.result = { error: true }
        return
    end if
    base = "https://menuslide.com/api"
    url = base + "/device/register"
    req = CreateObject("roUrlTransfer")
    req.setUrl(url)
    req.setRequest("POST")
    req.addHeader("Content-Type", "application/json")
    body = FormatJson({
        displayCode: code
        deviceId: id
        deviceModel: "Roku"
        osVersion: CreateObject("roDeviceInfo").getOSVersion()
    })
    req.setMinimumTransferRate(1024, 5)
    req.retainBodyOnError(true)
    json = invalid
    port = CreateObject("roMessagePort")
    req.setPort(port)
    for i = 0 to 2
        ok = req.asyncPostFromString(body)
        if ok
            msg = wait(15000, port)
            if type(msg) = "roUrlEvent" and msg.getResponseCode() = 200
                json = ParseJson(msg.getString())
                exit for
            end if
        end if
        sleep(2000 + i * 3000)
    end for
    if json <> invalid and json.error = invalid then
        m.top.result = json
    else
        m.top.result = { error: true }
    end if
end sub
