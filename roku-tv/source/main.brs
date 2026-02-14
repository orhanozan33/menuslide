sub Main()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    scene = screen.CreateScene("RootScene")
    screen.show()
    sleep(350)
    content = scene.findNode("content")
    if content <> invalid then content.observeField("exitRequested", m.port)
    scene.observeField("requestregister", m.port)
    while true
        msg = wait(0, m.port)
        if type(msg) = "roSGScreenEvent" and msg.isScreenClosed() then exit while
        if type(msg) = "roSGNodeEvent" then
            f = msg.getField()
            if f = "exitRequested" and msg.getData() = true then
                screen.close()
                exit while
            else if f = "requestregister" then
                data = msg.getData()
                print "[Main] requestregister received, data valid: " ; (data <> invalid)
                code = invalid
                id = invalid
                if data <> invalid then
                    code = data.displayCode
                    if code = invalid then code = data.displaycode
                    id = data.deviceId
                    if id = invalid then id = data.deviceid
                end if
                if data <> invalid and code <> invalid and id <> invalid then
                    result = DoRegister(code, id)
                    print "[Main] DoRegister returned, has error: " ; (result <> invalid and result.error <> invalid)
                    sec = CreateObject("roRegistrySection", "menuslide")
                    if result <> invalid and result.error = invalid then
                        sec.write("deviceToken", result.deviceToken)
                        if result.layoutVersion <> invalid and result.layoutVersion <> "" then sec.write("layoutVersion", result.layoutVersion)
                        if result.refreshIntervalSeconds <> invalid and result.refreshIntervalSeconds > 0 then sec.write("refreshInterval", Str(result.refreshIntervalSeconds))
                        layout = result.layout
                        if layout = invalid then layout = result.Lookup("layout")
                        slides = invalid
                        if layout <> invalid then
                            slides = layout.slides
                            if slides = invalid then slides = layout.Lookup("slides")
                        end if
                        if layout <> invalid then
                            sec.write("layout", FormatJson(layout))
                        end if
                        if slides <> invalid and slides.count() > 0 then
                            sec.write("layout_slide_count", Stri(slides.count()))
                            if layout.backgroundColor <> invalid then sec.write("layout_bg", layout.backgroundColor)
                            if layout.version <> invalid then sec.write("layout_ver", layout.version)
                            for i = 0 to slides.count() - 1
                                sec.write("layout_slide_" + Stri(i), FormatJson(slides[i]))
                            end for
                        end if
                        sec.write("pendingRegisterResult", FormatJson({ ok: true }))
                    else
                        sec.write("pendingRegisterResult", FormatJson(result))
                    end if
                    sec.flush()
                else
                    print "[Main] requestregister missing displayCode or deviceId"
                    sec = CreateObject("roRegistrySection", "menuslide")
                    sec.write("pendingRegisterResult", FormatJson({ error: true }))
                    sec.flush()
                end if
            end if
        end if
    end while
end sub

function DoRegister(displayCode as string, deviceId as string) as object
    base = "https://menuslide.com/api"
    url = base + "/device/register"
    print "[DoRegister] URL: " ; url
    print "[DoRegister] displayCode: " ; displayCode
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
    req.setCertificatesFile("common:/certs/ca-bundle.crt")
    req.initClientCertificates()
    json = invalid
    port = CreateObject("roMessagePort")
    req.setPort(port)
    for i = 0 to 2
        print "[DoRegister] Attempt " ; (i + 1) ; " asyncPostFromString..."
        ok = req.asyncPostFromString(body)
        if ok
            msg = wait(15000, port)
            if type(msg) = "roUrlEvent" then
                code = msg.getResponseCode()
                bodyStr = msg.getString()
                print "[DoRegister] Response Code: " ; code
                print "[DoRegister] Response Body: " ; bodyStr
                if code = 200 then
                    json = ParseJson(bodyStr)
                    if json <> invalid then
                        print "[DoRegister] ParseJson OK, got deviceToken"
                        exit for
                    else
                        print "[DoRegister] ParseJson failed for 200 body"
                    end if
                else
                    errMsg = "Code not found or server error."
                    if bodyStr <> "" then
                        errJson = ParseJson(bodyStr)
                        if errJson <> invalid and errJson.message <> invalid and errJson.message <> "" then
                            errMsg = errJson.message
                        end if
                    end if
                    print "[DoRegister] Error response, returning: " ; errMsg
                    return { error: true, message: errMsg }
                end if
            else
                print "[DoRegister] wait() got non-roUrlEvent: " ; type(msg)
            end if
        else
            print "[DoRegister] asyncPostFromString returned false"
        end if
        sleep(2000 + i * 3000)
    end for
    if json <> invalid and json.error = invalid then
        return json
    end if
    print "[DoRegister] No success, returning No connection"
    return { error: true, message: "No connection" }
end function
