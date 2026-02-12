' MenuSlide Device API - shared with Android
' Base: https://menuslide.com/api

function ApiRegister(displayCode as string, deviceId as string) as object
    base = "https://menuslide.com/api"
    url = base + "/device/register"
    req = CreateObject("roUrlTransfer")
    req.setUrl(url)
    req.setRequest("POST")
    req.addHeader("Content-Type", "application/json")
    body = FormatJson({
        displayCode: displayCode
        deviceId: deviceId
        deviceModel: "Roku"
        osVersion: CreateObject("roDeviceInfo").getOSVersion()
    })
    req.setMinimumTransferRate(1024, 5)
    req.retainBodyOnError(true)
    json = invalid
    for i = 0 to 2
        ok = req.asyncPostFromString(body)
        if ok
            port = CreateObject("roMessagePort")
            req.setPort(port)
            msg = wait(15000, port)
            if type(msg) = "roUrlEvent" and msg.getResponseCode() = 200
                json = ParseJson(msg.getString())
                exit for
            end if
        end if
        sleep(2000 + i * 3000)
    end for
    return json
end function

function ApiLayout(deviceToken as string) as object
    base = "https://menuslide.com/api"
    xfer = CreateObject("roUrlTransfer")
    url = base + "/device/layout?deviceToken=" + xfer.Escape(deviceToken)
    req = CreateObject("roUrlTransfer")
    req.setUrl(url)
    req.setRequest("GET")
    req.addHeader("X-Device-Token", deviceToken)
    req.setMinimumTransferRate(1024, 5)
    json = invalid
    for i = 0 to 2
        ok = req.asyncGetToString()
        if ok
            port = CreateObject("roMessagePort")
            req.setPort(port)
            msg = wait(15000, port)
            if type(msg) = "roUrlEvent" and msg.getResponseCode() = 200
                json = ParseJson(msg.getString())
                exit for
            end if
        end if
        sleep(2000 + i * 3000)
        req = CreateObject("roUrlTransfer")
        req.setUrl(url)
        req.addHeader("X-Device-Token", deviceToken)
        req.setMinimumTransferRate(1024, 5)
    end for
    return json
end function

sub ApiHeartbeat(deviceToken as string)
    base = "https://menuslide.com/api"
    url = base + "/device/heartbeat"
    req = CreateObject("roUrlTransfer")
    req.setUrl(url)
    req.setRequest("POST")
    req.addHeader("Content-Type", "application/json")
    body = FormatJson({ deviceToken: deviceToken })
    req.asyncPostFromString(body)
end sub
