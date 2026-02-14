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
                json = ParseJson(msg.getString())
                exit for
            end if
        end if
        sleep(2000 + i * 3000)
    end for
    if json <> invalid and json.error = invalid then
        lv = json.layoutVersion
        if lv = invalid then lv = ""
        print "[LayoutTask] layoutVersion="; lv
        layout = json.layout
        if layout = invalid then layout = json.Lookup("layout")
        slides = invalid
        if layout <> invalid then
            slides = layout.slides
            if slides = invalid then slides = layout.Lookup("slides")
        end if
        if slides <> invalid and slides.count() > 0 then
            sec = CreateObject("roRegistrySection", "menuslide")
            newVer = ""
            if json.layoutVersion <> invalid and json.layoutVersion <> "" then newVer = json.layoutVersion
            curVer = sec.read("layoutVersion")
            if curVer = invalid then curVer = ""
            ' Version changed: clear old cache to prevent stale layout
            if newVer <> "" and newVer <> curVer then
                print "[LayoutTask] version changed, clearing old cache"
                sec.delete("layout")
                cntStr = sec.read("layout_slide_count")
                if cntStr <> "" and cntStr <> invalid then
                    cnt = Int(Val(cntStr))
                    for i = 0 to cnt - 1
                        sec.delete("layout_slide_" + Stri(i))
                    end for
                end if
            end if
            if newVer <> "" then sec.write("layoutVersion", newVer)
            if json.refreshIntervalSeconds <> invalid and json.refreshIntervalSeconds > 0 then sec.write("refreshInterval", Str(json.refreshIntervalSeconds))
            sec.write("layout_slide_count", Stri(slides.count()))
            if layout.backgroundColor <> invalid then sec.write("layout_bg", layout.backgroundColor)
            if layout.version <> invalid then sec.write("layout_ver", layout.version)
            for i = 0 to slides.count() - 1
                sec.write("layout_slide_" + Stri(i), FormatJson(slides[i]))
            end for
            sec.flush()
        end if
        m.top.result = { ok: true }
    else
        m.top.result = { error: true }
    end if
end sub
