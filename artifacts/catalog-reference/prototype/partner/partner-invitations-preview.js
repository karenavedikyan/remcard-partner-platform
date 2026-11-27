// Generated from the approved standalone invitation mockup. Demo-only, no API calls.
const namesByRole=new Map();
const template = "<style>*{box-sizing:border-box}body{margin:0}button,input{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:3px solid #b5263180;outline-offset:3px}svg{display:block;flex-shrink:0;width:18px;height:18px}button{border:0;background:none;color:inherit}button:hover{color:var(--deep)}[hidden]{display:none!important}\n.top{height:68px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 max(24px,calc((100vw - 1232px)/2));gap:16px}.brand{display:flex;align-items:center;gap:10px}.logo{color:#c12b2f;width:34px;height:34px}.word{font-size:23px;font-weight:800;letter-spacing:-.08em;line-height:1}.word b{color:#c12b2f}.word small{display:block;color:var(--muted);font-size:9px;letter-spacing:.01em;margin-top:4px;font-weight:700}.scope{font-size:11px;font-weight:800;color:#765657;background:#f7efee;border:1px solid #eee0de;border-radius:100px;padding:6px 10px;white-space:nowrap}\n.layout{max-width:1280px;margin:auto;padding:25px 24px 40px;display:grid;grid-template-columns:174px minmax(0,1fr);gap:27px}.side{padding-top:39px}.side ul{list-style:none;margin:0;padding:0;display:grid;gap:5px}.side li{color:var(--muted);display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:9px;font-size:13px;font-weight:700}.side .here{color:#9a2731;background:#f2e7e4}.crumb{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px;font-weight:700;margin:0 0 14px}.crumb svg{width:13px;height:13px}.crumb b{color:var(--ink)}\n.workspace{min-width:0}.stage{background:#e9e4e0;border:1px solid #e1d9d5;border-radius:20px;position:relative;overflow:hidden;padding:22px 20px;display:grid;place-items:center;isolation:isolate}.stage::before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 75% 0,#fff9f4b0,transparent 66%)}\n.sheet{width:min(100%,650px);background:#fff;border:1px solid #e9dfdc;border-radius:19px;box-shadow:0 16px 34px #33232415;overflow:hidden}.sheetHead{padding:17px 21px 15px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px}.sheetIcon{display:grid;place-items:center;width:36px;height:36px;background:#faeeec;color:var(--red);border-radius:10px;flex:none}.sheetIcon svg{width:19px;height:19px}.headings{flex:1;min-width:0}.overline{margin:0 0 2px;color:var(--muted);font-size:10px;font-weight:800}.sheet h1{font-size:21px;letter-spacing:-.045em;line-height:1.18;margin:0;font-weight:800}.iconButton{width:34px;height:34px;border:1px solid var(--line);border-radius:9px;display:grid;place-items:center;color:var(--muted);flex:none}.iconButton:hover{background:#fbf4f3}.body{padding:16px 21px 17px}\n.sectionHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}.sectionHead h2{font-size:13px;font-weight:800;margin:0;display:flex;align-items:center;gap:7px}.sectionHead h2 svg{width:15px;height:15px;color:var(--muted)}.count{font-size:10px;font-weight:800;background:#f3efed;color:#675b5c;border-radius:6px;padding:1px 6px}.sectionCaption{font-size:11px;color:var(--muted);margin:0;text-align:right}\n.records{display:grid;gap:7px}.record{border:1px solid var(--line);border-radius:11px;min-width:0}.record.expanded{border-color:#ecd9d7}.recordTop{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px}.recordLabel{min-width:0}.recordTitle{font-weight:800;font-size:13px;display:flex;align-items:center;flex-wrap:wrap;gap:6px}.recordMeta{font-size:11px;color:var(--muted);margin-top:3px}.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:5px;font-size:9px;font-weight:800;white-space:nowrap;background:#ecf4ed;color:var(--green)}.badge::before{content:\"\";width:5px;height:5px;background:currentColor;border-radius:50%}.badge.done{background:#efedeb;color:#625956}.toggle{display:inline-flex;align-items:center;gap:4px;flex:none;font-weight:800;font-size:11px;color:#805056;min-height:34px;padding:0 5px 0 8px}.toggle svg{width:15px;height:15px}.expanded .toggle svg{transform:rotate(180deg)}\n.detail{padding:10px 11px 9px;background:var(--rose);border-top:1px solid #f0e1df;border-radius:0 0 10px 10px}.term{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:0 0 8px;color:#635355;font-size:11px}.term strong{font-weight:800;white-space:nowrap;color:#544143}.field{display:flex;gap:7px;align-items:center}.urlGroup{flex:1;min-width:0;position:relative}.urlGroup svg{position:absolute;left:9px;top:11px;color:#94777a;width:15px;height:15px;pointer-events:none}.url{display:block;width:100%;height:37px;background:#fff;border:1px solid #ecd9d7;border-radius:8px;padding:0 8px 0 31px;font-size:11px;color:#554547;text-overflow:ellipsis}.primary{height:37px;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:8px;padding:0 11px;background:var(--red);color:#fff;font-weight:800;font-size:11px;flex:none}.primary:hover{background:var(--deep);color:white}.primary svg{width:15px;height:15px}\n.actions{display:flex;align-items:center;gap:4px 12px;flex-wrap:wrap;margin-top:4px}.quiet{display:inline-flex;gap:4px;align-items:center;padding:0;min-height:28px;color:#695657;font-size:10.5px;font-weight:800}.quiet svg{width:13px;height:13px}.quiet.revoke{margin-left:auto;color:#942c37}.feedback{font-size:11px;color:var(--green);font-weight:800;margin:1px 0 0}.feedback:empty{display:none}\n.archive{border-top:1px solid var(--line);margin-top:13px;padding-top:11px}.archiveRow{background:#fbfaf9;border:1px solid #eee9e6;border-radius:10px;padding:8px 11px}.archMeta{display:flex;flex-wrap:wrap;gap:2px 14px;color:var(--muted);font-size:10.5px;margin-top:4px}.archMeta b{color:#51494a;font-weight:800}.noCopy{font-size:10.5px;color:var(--muted);margin:7px 0 0}\n.reopen{text-align:center;background:#fff;border:1px solid var(--line);border-radius:13px;padding:24px}.reopen h2{font-size:17px;margin:0 0 10px}.foot{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:11px;padding:10px 1px 0}.foot b{font-weight:800;color:#665051}\n@media(max-width:850px){.layout{grid-template-columns:minmax(0,1fr);gap:0}.side{display:none}}\n@media(max-width:520px){.top{height:57px;padding:0 13px}.layout{padding:13px 10px 24px}.crumb{font-size:11px;margin-bottom:9px;padding-left:3px}.stage{padding:0;border:0;background:transparent;border-radius:0}.sheet{border-radius:14px}.sheetHead{padding:12px 11px;gap:8px}.sheet h1{font-size:16px}.sheetIcon{width:30px;height:30px}.body{padding:11px 10px}.sectionCaption{font-size:10px}.recordTop,.detail,.archiveRow{padding-left:8px;padding-right:8px}.field{gap:4px}.primary{padding:0 7px;font-size:10px;gap:4px}.primary svg{width:13px;height:13px}.url{padding-left:23px}.urlGroup svg{left:6px;width:13px;height:13px}.actions{gap:2px 8px}.quiet{font-size:10px}.archive{margin-top:11px;padding-top:9px}.foot{font-size:10px;padding-inline:3px}}\n.stage{grid-template-columns:minmax(0,1fr)}.sheet{min-width:0}.sectionCaption,.term span{min-width:0;overflow-wrap:anywhere}\n@media(max-width:520px){.top{gap:8px}.scope{white-space:normal;text-align:center;max-width:46%;font-size:10px;padding:4px 7px}.primary,.url{height:40px}.urlGroup svg{top:13px}.quiet{min-height:34px}}\n.sheet{width:min(100%,780px)}.body{padding-top:0}\n.viewTabs{display:flex;gap:21px;border-bottom:1px solid var(--line);margin-bottom:12px}\n.viewTab{display:flex;align-items:center;gap:7px;min-height:49px;padding:0 2px;border-bottom:2px solid transparent;font-size:13px;font-weight:800;color:var(--muted)}\n.viewTab[aria-selected=\"true\"]{color:var(--deep);border-color:var(--red)}.viewTab[aria-selected=\"true\"] .count{color:var(--deep);background:#faeeec}\n.listHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}\n.listHead h2{font-size:12px;margin:0;color:var(--ink);font-weight:800}\n.listScroll{max-height:clamp(340px,calc(100dvh - 329px),510px);overflow:auto;scrollbar-color:#d1bfbd #f8f5f4;scrollbar-width:thin;scrollbar-gutter:stable;border:1px solid var(--line);border-radius:11px;background:#fbfaf9}\n.listScroll:focus-visible{outline:2px solid var(--red);outline-offset:2px}\n.listScroll .records{gap:0;background:white}\n.listScroll .record,.listScroll .archiveRow{border:0;border-radius:0;border-bottom:1px solid var(--line)}\n.listScroll .record:last-child,.listScroll .archiveRow:last-child{border-bottom:0}\n.recordTop,.archiveRow{padding:7px 11px;min-height:56px}\n.recordTop:hover{background:#fcfaf9}.record.expanded .recordTop{background:#fffaf9}\n.detail{border-radius:0;scroll-margin:5px}\n.recordMeta,.archMeta{font-size:11.5px}.archMeta{gap:2px 16px}\n.archMeta span{flex:0 1 237px}\n.archiveRow{background:#fff}.archiveRow:nth-child(even){background:#fcfaf9}\n.archiveType{font-size:10px;font-weight:700;color:var(--muted);background:#f4efed;border-radius:5px;padding:2px 6px}.archiveHelp{font-size:11px;color:var(--muted);margin:0 0 9px}\n.listFoot{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--muted);margin:9px 0 0}\n.listFoot span:last-child{text-align:right}.empty{padding:16px;margin:0}\n@media(max-width:520px){.viewTabs{gap:17px;margin-bottom:9px}.viewTab{min-height:43px}.listHead h2{font-size:11px}.listScroll{max-height:clamp(350px,calc(100dvh - 264px),560px)}.recordTop,.archiveRow{padding-inline:8px}.recordMeta,.archMeta{font-size:11px}.archMeta{display:grid;gap:2px}.listFoot{font-size:10px}}\n.rowActions{display:flex;align-items:center;gap:5px;flex:none}.rowActions button{gap:5px;padding:0 7px;border-radius:7px;white-space:nowrap;justify-content:center}.rowAction{min-height:34px;display:inline-flex;align-items:center;font-size:11px;font-weight:800;color:#674e50}.rowAction svg{width:14px;height:14px}.quickCopy{background:#faeeec;color:var(--deep);min-width:94px}.quickCopy:hover{background:#f4dedb}.quickCopy[data-copied=\"true\"]{background:#ecf4ed;color:var(--green)}.quickRevoke:hover,.rowActions .toggle:hover,.quickRevoke[aria-expanded=\"true\"]{background:#f7efed;color:var(--deep)}.quickRevoke:focus-visible,.rowActions .toggle:focus-visible,.quickCopy:focus-visible{outline-offset:1px}\n.confirmStrip,.copyFallback{padding:9px 11px;background:#fff8f6;border-top:1px solid #f0e1df}.confirmStrip{display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap}.confirmText{margin:0;font-size:11px;color:#61464a}.confirmText b{font-size:12px}.confirmActions{display:flex;gap:6px;margin-left:auto}.confirmActions button{min-height:34px}.cancel{border:1px solid #ecd9d7;border-radius:8px;padding:0 10px;font-size:11px;font-weight:800}.cancel:hover{background:#faeeec}.copyFallback p{margin:0 0 5px;font-size:11px;color:var(--muted)}.copyFallback textarea{height:40px;padding:7px 8px;resize:vertical}.srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}\n.recordTop{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;min-height:60px}.recordMeta .by{font-weight:700;color:#5e5052}.rowActions{gap:3px}.rowActions .quickCopy{min-width:108px}.rowActions .quickRevoke{width:34px;padding:0;justify-content:center}.rowActions .quickRevoke svg{width:16px;height:16px}\n.conditionsToggle{justify-self:start;display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 8px;border:1px solid var(--line);border-radius:7px;font-size:11px;font-weight:800;color:#5e5052;white-space:nowrap}.conditionsToggle .count{font-variant-numeric:tabular-nums;padding-inline:5px}.conditionsToggle svg{width:13px;height:13px}.conditionsToggle:hover,.conditionsToggle[aria-expanded=\"true\"]{border-color:#e8d8d5;background:#fbf4f3;color:var(--deep)}.conditionsToggle[aria-expanded=\"true\"] svg{transform:rotate(180deg)}\n.conditionsPane{padding:10px 12px 11px;background:#fcf9f8;border-top:1px solid var(--line)}.conditionsTable{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px}.conditionsTable th,.conditionsTable td{padding:7px 0;text-align:left}.conditionsTable th{padding-top:0;font-size:10.5px;color:var(--muted);font-weight:800}.conditionsTable td{border-top:1px solid var(--line)}.conditionsTable th:last-child,.conditionsTable td:last-child{width:114px;text-align:right}.conditionsTable td:first-child{padding-right:10px;overflow-wrap:anywhere}.conditionsTable td:last-child{color:#823940;font-weight:800;font-variant-numeric:tabular-nums}.conditionsTable td.excluded{color:var(--muted);font-weight:700}.moreTitle{font-size:12px;margin:0 0 6px;color:#544143}\n@media(max-width:570px){.recordTop{grid-template-columns:minmax(0,1fr) auto;gap:5px;min-height:0}.recordLabel{grid-column:1/-1}.recordMeta{font-size:11px;overflow-wrap:anywhere}.conditionsToggle{grid-row:2;grid-column:1;min-height:36px}.rowActions{grid-row:2;grid-column:2;gap:2px}.rowActions button{min-height:36px}.rowActions .quickCopy{min-width:92px;padding-inline:5px;font-size:10px}.rowActions .quickRevoke{width:36px}.conditionsPane{padding-inline:9px}}\n@media(max-width:350px){.rowActions .quickCopy{min-width:88px}.conditionsToggle{padding-inline:6px;gap:4px}}\n.listTopControls{display:flex;align-items:center;gap:10px;flex:none}.listHead h2{min-width:0}.selectionModeToggle{border:1px solid var(--line);border-radius:7px;padding:0 8px;min-height:32px;font-size:11px;font-weight:800;color:#674e50;white-space:nowrap}.selectionModeToggle:hover,.selectionModeToggle[aria-pressed=\"true\"]{background:#faeeec;color:var(--deep);border-color:#ecd9d7}.bulkBar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 10px;background:#f9f5f3;border:1px solid var(--line);border-radius:8px;padding:5px 8px;margin-bottom:8px}.bulkAll,.bulkRight{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800}.bulkAll{min-height:33px;cursor:pointer}.bulkBar .primary{height:33px}.bulkBar button:disabled,.selectionModeToggle:disabled{background:#f3efed;color:#645858;cursor:default}.bulkCount{color:var(--muted);white-space:nowrap}.bulkConfirm{margin-bottom:8px;border:1px solid #f0e1df;border-radius:8px}.inviteCheck,.bulkAll input{width:16px;height:16px;accent-color:var(--red);margin:0;flex:none;cursor:pointer}.selectCell{display:grid;place-items:center;width:30px;min-height:36px;cursor:pointer}.selecting .recordTop{grid-template-columns:auto minmax(0,1fr) auto;gap:7px}.selecting .rowActions{display:none}.selecting .record.selected .recordTop{background:#fff7f5}\n@media(max-width:570px){.listTopControls .sectionCaption{display:none}.selecting .recordTop{grid-template-columns:auto minmax(0,1fr) auto;align-items:center}.selecting .selectCell{width:24px;grid-column:1;grid-row:1}.selecting .recordLabel{grid-column:2;grid-row:1}.selecting .conditionsToggle{grid-column:3;grid-row:1}.bulkRight{gap:5px}.bulkAll,.bulkRight{font-size:10px}.bulkBar{padding-inline:6px;gap:4px 7px}}\n:host{display:block;min-width:0;font:inherit;color:var(--ink);\n  --red:var(--accent);--deep:#94262d;--rose:#fcf7f6;--green:var(--good);\n  --pi-hover:#fcfaf9;--pi-panel:#fcf9f8;--pi-accent-box:#faeeec;--pi-accent-hover:#f4dedb;\n  --pi-positive:#ecf4ed;--pi-selected:#fff7f5;--pi-confirm:#fff8f6;--pi-strong:#5e5052;\n  --pi-action:#674e50;--pi-muted:#675b5c;--pi-rate:#823940;--pi-line-soft:#ecd9d7;\n  --pi-overlay:#f9f5f3;\n}\n:host-context([data-theme=dark]) {\n  --deep:#f49391;--rose:#2d2223;--pi-hover:#292d2a;--pi-panel:#2b2d2a;\n  --pi-accent-box:#3b2729;--pi-accent-hover:#503233;--pi-positive:#23392e;\n  --pi-selected:#312526;--pi-confirm:#332628;--pi-strong:#dfd3d2;\n  --pi-action:#e0cbc9;--pi-muted:#cdc9c5;--pi-rate:#f2a7a2;--pi-line-soft:#645051;\n  --pi-overlay:#2b2f2c;\n}\n.body{padding:0!important}.viewTabs{margin-bottom:10px}.viewTab{min-height:43px}\n.count,.archiveType{background:var(--offset);color:var(--pi-muted)}\n.viewTab[aria-selected=true] .count,.quickCopy,.selectionModeToggle:hover,.selectionModeToggle[aria-pressed=true]{background:var(--pi-accent-box);color:var(--deep)}\n.listScroll{max-height:clamp(180px,calc(100dvh - 300px),475px);background:var(--surface);scrollbar-color:var(--line) var(--surface)}\n.body:has(#bulkBar:not([hidden])) #activePanel .listScroll{max-height:clamp(150px,calc(100dvh - 348px),425px)}\n.body:has(#bulkConfirm:not([hidden])) #activePanel .listScroll{max-height:clamp(130px,calc(100dvh - 434px),370px)}\n.listScroll .records,.archiveRow{background:var(--surface)}\n.listScroll .archiveRow:nth-child(even),.recordTop:hover{background:var(--pi-hover)}\n.record.expanded .recordTop,.selecting .record.selected .recordTop{background:var(--pi-selected)}\n.recordMeta .by,.archMeta b,.conditionsToggle{color:var(--pi-strong)}\n.rowAction,.selectionModeToggle{color:var(--pi-action)}\n.rowActions .quickCopy{color:var(--deep)}\n.quickCopy:hover,.quickRevoke:hover,.quickRevoke[aria-expanded=true]{background:var(--pi-accent-hover);color:var(--deep)}\n.quickCopy[data-copied=true]{background:var(--pi-positive);color:var(--green)}\n.conditionsToggle:hover,.conditionsToggle[aria-expanded=true]{border-color:var(--pi-line-soft);background:var(--rose);color:var(--deep)}\n.conditionsPane{background:var(--pi-panel)}.conditionsTable td:last-child{color:var(--pi-rate)}\n.conditionsTable td.excluded{color:var(--muted)}\n.confirmStrip,.copyFallback{background:var(--pi-confirm);border-color:var(--pi-line-soft)}\n.confirmText{color:var(--pi-strong)}.cancel{border-color:var(--pi-line-soft)}.cancel:hover{background:var(--pi-accent-box)}\n.primary,.primary:hover{background:var(--accent);color:var(--onaccent)}.primary:hover{filter:brightness(.93)}\n.bulkBar{background:var(--pi-overlay)}.bulkBar button:disabled,.selectionModeToggle:disabled{background:var(--offset);color:var(--muted)}\n.selectionModeToggle:hover,.selectionModeToggle[aria-pressed=true]{border-color:var(--pi-line-soft)}\n.copyFallback textarea{background:var(--surface);border-color:var(--line);color:var(--ink)}\n.recordMeta{overflow-wrap:anywhere}\n.inviteNameLine{display:flex;align-items:center;flex-wrap:wrap;gap:2px 7px;min-width:0}\n.inviteName{overflow-wrap:anywhere;min-width:0;max-width:100%}\n.inviteType{border:1px solid var(--type-border,var(--line));border-radius:999px;background:var(--type-bg,var(--offset));color:var(--type-ink,var(--pi-muted));font-size:11px;font-weight:750;line-height:1.3;white-space:nowrap;padding:2px 6px}\n[data-type=store]{--type-bg:#fbebe8;--type-ink:#913b3a;--type-border:#f0d7d2}\n[data-type=company]{--type-bg:#e9eff6;--type-ink:#3d5573;--type-border:#d7e2ef}\n[data-type=specialist]{--type-bg:#e8f1ea;--type-ink:#3b6249;--type-border:#d6e7da}\n[data-type=agent]{--type-bg:#f5eee0;--type-ink:#785829;--type-border:#e9dfc8}\n:host-context([data-theme=dark]) [data-type=store]{--type-bg:#3f2929;--type-ink:#f2aaa5;--type-border:#684140}\n:host-context([data-theme=dark]) [data-type=company]{--type-bg:#283543;--type-ink:#b5cce6;--type-border:#43566c}\n:host-context([data-theme=dark]) [data-type=specialist]{--type-bg:#293b30;--type-ink:#b3d3bb;--type-border:#405a49}\n:host-context([data-theme=dark]) [data-type=agent]{--type-bg:#3a3224;--type-ink:#e2c78d;--type-border:#5a4a32}\n.renameInvite{background:transparent;color:var(--muted);border:1px solid transparent;border-radius:6px;display:grid;place-items:center;width:28px;height:28px;padding:0;flex:none}\n.renameInvite svg{width:14px;height:14px}\n.renameInvite:hover,.renameInvite[aria-expanded=true]{background:var(--pi-accent-box);color:var(--deep);border-color:var(--pi-line-soft)}\n.renameForm{background:var(--pi-panel);border-top:1px solid var(--line);padding:10px 11px;display:grid;gap:6px}\n.renameForm[hidden]{display:none}\n.renameForm label{display:grid;gap:4px;font-size:12px;font-weight:750}\n.renameForm input{width:100%;min-width:0;padding:8px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font-size:14px}\n.renameForm p,.inviteTermsNote{margin:0;color:var(--muted);font-size:12px}\n.inviteTermsNote{padding:9px 11px;white-space:pre-wrap;overflow-wrap:anywhere}\n.browseBar{display:flex;align-items:center;gap:8px;margin-bottom:9px}\n.inviteSearchBox{display:flex;align-items:center;gap:7px;flex:1;max-width:420px;min-width:0;min-height:36px;padding:0 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--muted)}\n.inviteSearchBox svg{width:16px;height:16px;flex:none}\n.inviteSearchBox input{width:100%;min-width:0;padding:6px 0;border:0;background:transparent;color:var(--ink);font-size:12px;outline:none}\n.inviteSearchBox input::-webkit-search-cancel-button{display:none}\n.inviteSearchBox:focus-within{outline:2px solid var(--accent);outline-offset:1px}\n.inviteSearchBox #clearInviteSearch{flex:none;width:24px;min-height:26px;padding:0;background:transparent;color:var(--muted);border:0;font-size:18px}\n.layoutSwitch{display:flex;gap:2px;background:var(--offset);border:1px solid var(--line);border-radius:8px;padding:2px;flex:none}\n.layoutSwitch[hidden]{display:none}\n.layoutSwitch button{border:1px solid transparent;background:transparent;color:var(--muted);border-radius:6px;padding:0 9px;min-height:30px;font-size:12px;font-weight:750}\n.layoutSwitch button[aria-pressed=true]{border-color:var(--line);color:var(--ink);background:var(--surface)}\n.listScroll:has(.cardGrid){background:var(--offset)}\n.listScroll .cardGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),340px));justify-content:center;align-items:start;gap:12px 17px;padding:10px;background:transparent}\n.cardGrid .empty{grid-column:1/-1}\n.listScroll .cardGrid .record{border:0;background:transparent;scroll-margin-block:8px}\n.inviteFace{\n  position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:30px minmax(0,1fr) auto auto;\n  width:100%;aspect-ratio:340 / 230;border:1px solid #5a606c8c;border-radius:16px;overflow:hidden;color:#f4f5f7;\n  background:radial-gradient(120% 80% at 100% 0%,rgba(181,42,46,.1),transparent 50%),linear-gradient(152deg,#454a52 0%,#2a2e35 44%,#15171c 100%);\n  box-shadow:0 8px 16px #10121629,inset 0 1px 0 #ffffff16,inset 0 -1px 0 #0005\n}\n.inviteFace::after{content:\"\";position:absolute;inset:-20% -10% -10% 35%;opacity:.07;z-index:-1;pointer-events:none;transform:rotate(-12deg);transform-origin:70% 40%;background-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'320'%20height%3D'160'%20viewBox%3D'0%200%20320%20160'%3E%3Csvg%20x%3D'8'%20y%3D'8'%20width%3D'30'%20height%3D'30'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'%23ffffff'%20stroke-width%3D'1.5'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Crect%20x%3D'4'%20y%3D'4'%20width%3D'12'%20height%3D'6'%20rx%3D'1.5'%2F%3E%3Cpath%20d%3D'M16%207h3v4h-8v3'%2F%3E%3Crect%20x%3D'10'%20y%3D'14'%20width%3D'2'%20height%3D'6'%20rx%3D'1'%2F%3E%3C%2Fsvg%3E%3Csvg%20x%3D'88'%20y%3D'8'%20width%3D'30'%20height%3D'30'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'%23ffffff'%20stroke-width%3D'1.5'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M13%205l6%206-2%202-6-6z'%2F%3E%3Cpath%20d%3D'M11%207l-7%207%202%202%207-7'%2F%3E%3Cpath%20d%3D'M4%2020l3-3'%2F%3E%3C%2Fsvg%3E%3Csvg%20x%3D'168'%20y%3D'8'%20width%3D'30'%20height%3D'30'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'%23ffffff'%20stroke-width%3D'1.5'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M9%2018h6M10%2021h4M12%203a6%206%200%200%200-4%2010.5c.6.6%201%201.3%201%202.5h6c0-1.2.4-1.9%201-2.5A6%206%200%200%200%2012%203z'%2F%3E%3C%2Fsvg%3E%3Csvg%20x%3D'248'%20y%3D'8'%20width%3D'30'%20height%3D'30'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'%23ffffff'%20stroke-width%3D'1.5'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M3%205h18v14H3zM3%2010h18M3%2015h18M9%205v5M15%2010v5M9%2015v4'%2F%3E%3C%2Fsvg%3E%3Csvg%20x%3D'8'%20y%3D'88'%20width%3D'30'%20height%3D'30'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'%23ffffff'%20stroke-width%3D'1.5'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M4%204l10%204-6%2010z'%2F%3E%3Cpath%20d%3D'M12%2011l7%207'%2F%3E%3C%2Fsvg%3E%3Csvg%20x%3D'88'%20y%3D'88'%20width%3D'30'%20height%3D'30'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'%23ffffff'%20stroke-width%3D'1.5'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M4%204h7v7H4zM13%204h7v7h-7zM4%2013h7v7H4zM13%2013h7v7h-7z'%2F%3E%3C%2Fsvg%3E%3Csvg%20x%3D'168'%20y%3D'88'%20width%3D'30'%20height%3D'30'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'%23ffffff'%20stroke-width%3D'1.5'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M6%2010h8a4%204%200%200%201%204%204v2M10%206v4M7%206h6M18%2018v2'%2F%3E%3C%2Fsvg%3E%3Csvg%20x%3D'248'%20y%3D'88'%20width%3D'30'%20height%3D'30'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'%23ffffff'%20stroke-width%3D'1.5'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M5%2011V8a3%203%200%200%201%203-3h8a3%203%200%200%201%203%203v3'%2F%3E%3Cpath%20d%3D'M4%2013a2%202%200%200%201%204%200v3h8v-3a2%202%200%200%201%204%200v4H4z'%2F%3E%3Cpath%20d%3D'M6%2020v1M18%2020v1'%2F%3E%3C%2Fsvg%3E%3C%2Fsvg%3E\");background-size:160px 120px;mask-image:linear-gradient(90deg,transparent,#000 45%)}\n.inviteCardHead{display:flex;align-items:center;gap:7px}\n.inviteRibbon{align-self:flex-start;margin-right:auto;border-radius:16px 0 10px 10px;padding:0 14px;height:30px;background:var(--invite-ribbon,#50545e);color:#fff;font-size:13px;font-weight:750;line-height:30px;white-space:nowrap;box-shadow:0 3px 10px #0003}\n[data-type=store]{--invite-ribbon:#b52a2e}[data-type=company]{--invite-ribbon:#425c7d}\n[data-type=specialist]{--invite-ribbon:#39604d}[data-type=agent]{--invite-ribbon:#775725}\n.inviteWordmark{padding-right:17px;color:#f4f5f7;font-size:15px;font-weight:850;letter-spacing:-.055em}\n.inviteWordmark span{color:#ff9497}\n.inviteFaceName{align-self:center;text-align:center;padding:3px 12px;min-width:0}\n.inviteFaceName .inviteName{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:clamp(17px,4.6vw,24px);font-weight:850;line-height:1.15;letter-spacing:-.028em;color:#fff}\n.inviteFaceName .inviteRecipient{display:block;color:#d4d9e1;font-size:11px;margin-top:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}\n.inviteFaceAuthor{text-align:center;padding:0 8px 8px;font-size:12px;color:#d4d9e1;line-height:1.35}\n.inviteFaceAuthor>span{display:block;font-size:10px}.inviteFaceAuthor strong{color:#fff}\n.inviteCardActions{border-top:1px solid #ffffff24;padding:6px 8px;display:flex;justify-content:space-between;align-items:center;gap:4px}\n.inviteCardActions .rowActions{gap:3px;min-width:0}\n.inviteCardActions :is(.conditionsToggle,.renameInvite,.quickRevoke,.quickCopy){min-height:34px;border:1px solid transparent;border-radius:7px;background:transparent;color:#f4f5f7}\n.inviteCardActions .conditionsToggle{border-color:#ffffff3a;gap:4px;padding-inline:6px}\n.inviteCardActions .conditionsToggle .count{background:#ffffff22;color:#fff}\n.inviteCardActions :is(.renameInvite,.quickRevoke){width:32px;min-width:32px;padding:0}\n.inviteCardActions .quickCopy{min-width:0;padding-inline:8px;background:#ffffff25;color:#fff}\n.inviteCardActions :is(button:hover,[aria-expanded=true]){color:#fff;border-color:#ffffff55;background:#ffffff25}\n.inviteCardActions .quickCopy[data-copied=true]{background:#3b6250;color:#fff}\n.cardGrid .selectCell{min-height:27px;width:31px}\n.cardGrid .record.selected .inviteFace{box-shadow:inset 0 0 0 2px #ffaaa8}\n.cardGrid .record :is(.renameForm,.confirmStrip,.copyFallback,.conditionsPane){margin-top:5px;border:1px solid var(--line);border-radius:10px}\n@media(max-width:570px){\n  .renameInvite{width:34px;height:32px}.inviteNameLine{gap:0 6px}\n}\n@media(max-width:355px){\n  .browseBar{gap:5px}.layoutSwitch button{padding-inline:6px}\n  .inviteCardActions{padding:3px 5px;gap:2px}\n  .inviteCardActions .rowActions{gap:1px}\n  .inviteCardActions :is(.conditionsToggle,.renameInvite,.quickRevoke,.quickCopy){min-height:31px}\n  .inviteCardActions :is(.renameInvite,.quickRevoke){width:29px;min-width:29px}\n  .inviteCardActions .quickCopy{width:32px;padding:0}\n  .inviteCardActions .quickCopy span{display:none}\n  .inviteFaceName{padding-block:1px}\n  .inviteFaceName .inviteName{font-size:16px}\n  .inviteFaceName .inviteRecipient{font-size:10px;line-height:1.1;margin-top:0}\n  .inviteFaceAuthor{font-size:11px;line-height:1.15;padding-bottom:4px}\n}\nbutton:focus-visible,input:focus-visible,.listScroll:focus-visible{outline-color:var(--accent)}\n</style><svg aria-hidden=\"true\" style=\"position:absolute;width:0;height:0;overflow:hidden\" xmlns=\"http://www.w3.org/2000/svg\">\n<defs>\n<symbol id=\"link\" viewBox=\"0 0 24 24\"><path d=\"M10 13a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7L12 6m0 12-1.3 1.3A4 4 0 1 1 5 13.6l3-3a4 4 0 0 1 6 .4\"/></symbol>\n<symbol id=\"copy\" viewBox=\"0 0 24 24\"><rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"/></symbol>\n<symbol id=\"check\" viewBox=\"0 0 24 24\"><path d=\"m5 12 4 4L19 6\"/></symbol>\n<symbol id=\"revoke\" viewBox=\"0 0 24 24\"><path d=\"M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5\"/></symbol>\n<symbol id=\"chevron\" viewBox=\"0 0 24 24\"><path d=\"m6 9 6 6 6-6\"/></symbol>\n<symbol id=\"right\" viewBox=\"0 0 24 24\"><path d=\"m9 6 6 6-6 6\"/></symbol>\n<symbol id=\"close\" viewBox=\"0 0 24 24\"><path d=\"m6 6 12 12M18 6 6 18\"/></symbol>\n<symbol id=\"home\" viewBox=\"0 0 24 24\"><path d=\"m4 10 8-6 8 6v10H4zM10 20v-6h4v6\"/></symbol>\n<symbol id=\"users\" viewBox=\"0 0 24 24\"><circle cx=\"9\" cy=\"7\" r=\"3\"/><path d=\"M3 19v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-15a3 3 0 0 1 0 6m5 9v-2a4 4 0 0 0-3-4\"/></symbol>\n<symbol id=\"wallet\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M3 8V6l3-2h12m3 7h-6v4h6m-4-2h.01\"/></symbol>\n</defs>\n</svg><div class=\"body\">\n          <div class=\"viewTabs\" role=\"tablist\" aria-label=\"Разделы приглашений\">\n            <button class=\"viewTab\" id=\"activeTab\" type=\"button\" role=\"tab\" aria-selected=\"true\" aria-controls=\"activePanel\">Активные <span class=\"count\" id=\"activeCount\"></span></button>\n            <button class=\"viewTab\" id=\"archiveTab\" type=\"button\" role=\"tab\" aria-selected=\"false\" aria-controls=\"archivePanel\" tabindex=\"-1\">Архив <span class=\"count\" id=\"archiveCount\"></span></button>\n          </div>\n          <div class=\"browseBar\">\n            <div class=\"inviteSearchBox\">\n              <svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"><circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"m16 16 4 4\"/></svg>\n              <input id=\"inviteSearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Найти приглашение\" aria-label=\"Поиск по имени, типу или автору\">\n              <button id=\"clearInviteSearch\" type=\"button\" aria-label=\"Очистить поиск\" hidden>×</button>\n            </div>\n            <div class=\"layoutSwitch\" id=\"inviteLayouts\" role=\"group\" aria-label=\"Вид приглашений\">\n              <button id=\"viewCards\" type=\"button\" aria-pressed=\"true\">Карты</button>\n              <button id=\"viewList\" type=\"button\" aria-pressed=\"false\">Список</button>\n            </div>\n          </div>\n          <section id=\"activePanel\" role=\"tabpanel\" aria-labelledby=\"activeTab\">\n            <div class=\"listHead\"><h2>Действуют до принятия или отзыва</h2><div class=\"listTopControls\"><p class=\"sectionCaption\">Сначала новые</p><button id=\"selectionMode\" class=\"selectionModeToggle\" type=\"button\" aria-pressed=\"false\" aria-controls=\"bulkBar\">Выбрать</button></div></div>\n            <div class=\"bulkBar\" id=\"bulkBar\" hidden>\n              <label class=\"bulkAll\"><input id=\"selectAll\" type=\"checkbox\"><span id=\"selectAllLabel\">Выбрать все</span></label>\n              <div class=\"bulkRight\"><span class=\"bulkCount\" id=\"bulkCount\" role=\"status\"></span><button id=\"bulkAsk\" class=\"primary\" type=\"button\" aria-controls=\"bulkConfirm\" aria-expanded=\"false\" disabled>Отозвать</button></div>\n            </div>\n            <div id=\"bulkConfirm\" class=\"confirmStrip bulkConfirm\" hidden>\n              <p class=\"confirmText\"><b id=\"bulkConfirmTitle\">Отозвать выбранные ссылки?</b><br>Они перестанут работать и исчезнут из активных.</p>\n              <div class=\"confirmActions\">\n                <button id=\"bulkCancel\" class=\"cancel\" type=\"button\">Отмена</button>\n                <button id=\"bulkConfirmButton\" class=\"primary\" type=\"button\">Отозвать</button>\n              </div>\n            </div>\n            <div class=\"listScroll\" tabindex=\"0\" role=\"region\" aria-label=\"Список активных ссылок\"><div class=\"records\" id=\"active\"></div></div>\n            <p class=\"listFoot\"><span id=\"activeTotal\" role=\"status\"></span><span>Сначала новые</span></p>\n          </section>\n          <section id=\"archivePanel\" role=\"tabpanel\" aria-labelledby=\"archiveTab\" hidden>\n            <div class=\"listHead\"><h2>Принятые приглашения</h2><p class=\"sectionCaption\">Только история</p></div>\n            <p class=\"archiveHelp\">Чтобы прекратить сотрудничество, откройте карточку партнёра в разделе «Партнёры».</p>\n            <div class=\"listScroll\" tabindex=\"0\" role=\"region\" aria-label=\"Список архивных приглашений\"><div class=\"records\" id=\"archive\"></div></div>\n            <p class=\"listFoot\"><span id=\"archiveTotal\" role=\"status\"></span></p>\n          </section>\n        </div>";
export class RemcardInvitationPreview extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode: "open"});
    root.innerHTML = template;
    const $=s=>root.querySelector(s);
    const icon=(id)=>`<svg aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><use href="#${id}"/></svg>`;
    const examples=[
      ["Магазин","Двери","10%"],["Специалист","Напольные покрытия","8%"],["Компания","Ремонт под ключ","7%"],
      ["Агент","Отделочные материалы","5%"],["Магазин","Сантехника","6%"],["Специалист","Электромонтаж","8%"],
      ["Компания","Кухни на заказ","10%"],["Магазин","Освещение","7%"],["Агент","Мебель","5%"],["Специалист","Покраска стен","8%"]
    ];
    const authors=["Анна Волкова","Денис Миронов","Ирина Левина"];
    const extraConditions=[
      [["Напольные покрытия","8%"],["Монтаж дверей","5%"]],
      [["Укладка напольных покрытий","12%"]],
      [],
      [["Сантехника","6%"],["Малярные работы","4%"],["Доставка",null]],
      [["Монтаж сантехники","9%"],["Комплектующие","4%"]]
    ];
    const recipients=["Михаил Орлов","Ольга Никифорова","Роман Соколов","Елена Фомина","Артём Серов","Вера Сидорова","Павел Егоров"];
    const asDate=new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit",timeZone:"UTC"});
    const sampleDate=(dayOffset,minutes)=>asDate.format(new Date(Date.UTC(2026,10,19-dayOffset,0,minutes))).replace(" в ",", ");
    const activeRecipients=["Двери и пол", "Илья Лебедев", "Ремонт Бюро", "Мария Громова", "Всё для ванной", "Павел Мельников", "Кухни Линия", "Дом Света", "Ольга Фёдорова", "Андрей Жуков"];
    const typeKey=type=>({"Магазин":"store","Компания":"company","Специалист":"specialist","Агент":"agent"})[type]||"unknown";
    const escapeText=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
    let sampleNames=new Map();
    let active=Array.from({length:24},(_,i)=>{
      const [type,category,rate]=examples[i%examples.length],id=String(i+1).padStart(3,"0");
      const recipient=activeRecipients[i%activeRecipients.length]+(i>=activeRecipients.length?` · проект ${Math.floor(i/activeRecipients.length)+1}`:"");
      return {id,type,recipient,name:sampleNames.get(id)||recipient,terms:[[category,rate],...extraConditions[i%extraConditions.length]],author:authors[i%authors.length],date:sampleDate(Math.floor(i/3),960-(i%3)*115),note:"Приглашаю к сотрудничеству в RemCard. По ссылке можно посмотреть условия и принять приглашение.",url:`https://remcard.example/invite/DEMO-${id}`};
    });
    const archived=Array.from({length:86},(_,i)=>{
      const [type]=examples[(i+4)%examples.length];
      return {type,author:authors[i%authors.length],date:sampleDate(Math.floor(i/3)+2,660+i%3*30),recipient:recipients[i%recipients.length],accepted:sampleDate(Math.floor(i/3),1040-i%3*45)};
    });
    let expanded="";
    let pendingRevoke="";
    let editing="";
    let saveCabinetName=()=>{};
    let revokeCabinet=()=>{};
    let selectionMode=false;
    let layout="cards";
    let query="";
    const selectedIds=new Set();
    const normalized=value=>String(value??"").toLowerCase().replace(/ё/g,"е");
    const matches=r=>!query||query.split(/\s+/).every(part=>normalized([r.name,r.recipient,r.type,r.author].join(" ")).includes(part));
    const visibleActive=()=>active.filter(matches);
    function resetListScroll(){
      for(const region of $("#active").getRootNode().querySelectorAll(".listScroll"))region.scrollTop=0;
    }
    function updateInviteQuery(){
      query=normalized($("#inviteSearch").value).trim();
      $("#clearInviteSearch").hidden=!$("#inviteSearch").value;
      dismissRevoke();hideBulkConfirm();selectedIds.clear();editing="";expanded="";
      render();resetListScroll();
    }
    $("#inviteSearch").addEventListener("input",updateInviteQuery);
    $("#clearInviteSearch").onclick=()=>{$("#inviteSearch").value="";updateInviteQuery();$("#inviteSearch").focus();};
    for(const [id,next] of [["viewCards","cards"],["viewList","list"]]){
      $(`#${id}`).onclick=()=>{
        if(layout===next)return;
        dismissRevoke();hideBulkConfirm();editing="";layout=next;
        const record=$("#active").firstElementChild;
        const anchor=Array.from($("#active").children).find(row=>row.dataset.id&&row.getBoundingClientRect().bottom>=$("#active").parentElement.getBoundingClientRect().top)||record;
        const anchorId=anchor?.dataset.id;
        render();
        if(anchorId)$(`[data-id="${anchorId}"]`)?.scrollIntoView({block:"nearest"});
      };
    }
    function hideBulkConfirm(restoreFocus=false){
      $("#bulkConfirm").hidden=true;$("#bulkAsk").setAttribute("aria-expanded","false");
      if(restoreFocus)$("#bulkAsk").focus();
    }
    function refreshSelection(){
      const count=visibleActive().length;
      $("#active").classList.toggle("selecting",selectionMode);
      $("#selectionMode").setAttribute("aria-pressed",String(selectionMode));
      $("#selectionMode").textContent=selectionMode?"Готово":"Выбрать";
      $("#selectionMode").disabled=!selectionMode&&count===0;
      $("#bulkBar").hidden=!selectionMode;
      $("#bulkCount").textContent=`Выбрано: ${selectedIds.size}`;
      $("#selectAllLabel").textContent=`${query?"Выбрать найденные":"Выбрать все"} (${count})`;
      $("#selectAll").disabled=count===0;
      $("#selectAll").checked=count>0&&selectedIds.size===count;
      $("#selectAll").indeterminate=selectedIds.size>0&&!$("#selectAll").checked;
      $("#bulkAsk").disabled=selectedIds.size===0;
      for(const record of $("#active").querySelectorAll("[data-id]")){
        const checked=selectedIds.has(record.dataset.id);
        record.querySelector(".inviteCheck").checked=checked;record.classList.toggle("selected",checked);
      }
    }
    function endSelection(){
      if(!selectionMode)return;
      selectionMode=false;selectedIds.clear();hideBulkConfirm();render();
    }
    $("#selectionMode").onclick=()=>{
      if(selectionMode){endSelection();return;}
      dismissRevoke();editing="";selectionMode=true;expanded="";render();
    };
    $("#selectAll").onchange=(e)=>{
      hideBulkConfirm();selectedIds.clear();
      if(e.target.checked)for(const row of visibleActive()) selectedIds.add(row.id);
      refreshSelection();
    };
    $("#bulkAsk").onclick=()=>{
      if(!selectionMode||!selectedIds.size)return;
      if(!$("#bulkConfirm").hidden){hideBulkConfirm(true);return;}
      $("#bulkConfirmTitle").textContent=`Отозвать выбранные ссылки (${selectedIds.size})?`;
      $("#bulkConfirm").hidden=false;$("#bulkAsk").setAttribute("aria-expanded","true");$("#bulkCancel").focus();
    };
    $("#bulkCancel").onclick=()=>hideBulkConfirm(true);
    $("#bulkConfirmButton").onclick=()=>{
      if(!selectionMode||!selectedIds.size||$("#bulkConfirm").hidden)return;
      const ids=active.filter(row=>row.cabinet&&selectedIds.has(row.id)).map(row=>row.id);
      if(ids.length)revokeCabinet(ids);
      active=active.filter(row=>!selectedIds.has(row.id));
      if(selectedIds.has(expanded))expanded="";
      selectedIds.clear();hideBulkConfirm();
      if(!visibleActive().length)selectionMode=false;
      render();(visibleActive().length?$("#selectionMode"):query?$("#inviteSearch"):$("#archiveTab")).focus();
    };
    $("#activePanel").addEventListener("keydown",(e)=>{
      if(e.key==="Escape"&&!$("#bulkConfirm").hidden){e.preventDefault();hideBulkConfirm(true);}
    });
    $("#active").addEventListener("change",(e)=>{
      if(!selectionMode||!e.target.matches(".inviteCheck"))return;
      const id=e.target.closest("[data-id]").dataset.id;
      hideBulkConfirm();if(e.target.checked)selectedIds.add(id);else selectedIds.delete(id);refreshSelection();
    });
    function dismissRevoke(restoreFocus=false){
      if(!pendingRevoke)return;
      const row=$(`[data-id="${pendingRevoke}"]`);
      pendingRevoke="";
      if(!row)return;
      row.querySelector(".confirmStrip").hidden=true;
      const button=row.querySelector(".quickRevoke");
      button.setAttribute("aria-expanded","false");
      if(restoreFocus)button.focus();
    }
    function selectView(view,focus=false){
      dismissRevoke();
      $("#inviteLayouts").hidden=view==="archive";
      if(view==="archive"&&editing){editing="";render();}
      if(view==="archive")endSelection();
      for(const key of ["active","archive"]){
        const selected=key===view,tab=$(`#${key}Tab`),panel=$(`#${key}Panel`);
        tab.setAttribute("aria-selected",String(selected));tab.tabIndex=selected?0:-1;
        panel.hidden=!selected;
        if(selected){panel.querySelector(".listScroll").scrollTop=0;if(focus)tab.focus();}
      }
    }
    for(const key of ["active","archive"]){
      $(`#${key}Tab`).onclick=()=>selectView(key);
      $(`#${key}Tab`).onkeydown=(e)=>{
        if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
        e.preventDefault();selectView(e.key==="Home"?"active":e.key==="End"?"archive":key==="active"?"archive":"active",true);
      };
    }
    function render(){
      const shown=visibleActive(),shownArchive=archived.filter(matches),cards=layout==="cards";
      $("#activeCount").textContent=active.length;
      $("#archiveCount").textContent=archived.length;
      $("#activeTotal").textContent=query?`Найдено: ${shown.length} из ${active.length}`:`Всего ссылок: ${active.length}`;
      $("#archiveTotal").textContent=query?`Найдено: ${shownArchive.length} из ${archived.length}`:`Всего записей: ${archived.length}`;
      $("#active").classList.toggle("cardGrid",cards);
      $("#viewCards").setAttribute("aria-pressed",String(cards));
      $("#viewList").setAttribute("aria-pressed",String(!cards));
      $("#active").innerHTML=shown.map(r=>{
        const termsOpen=r.id===expanded;
        const check=`<label class="selectCell" ${selectionMode?"":"hidden"}><input class="inviteCheck" type="checkbox" aria-label="Выбрать: ${escapeText(r.name)}, ${escapeText(r.date)}"></label>`;
        const rename=`<button type="button" class="renameInvite" data-action="rename" aria-label="Переименовать приглашение: ${escapeText(r.name)}" aria-expanded="${editing===r.id}" title="Изменить название"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m16 4 4 4M4 20l4-.9L20 7a2.8 2.8 0 0 0-4-4L4.9 15.1 4 20Z"/></svg></button>`;
        const controls=`<button class="conditionsToggle" type="button" data-action="terms" aria-expanded="${termsOpen}" aria-controls="terms-${r.id}">Условия ${r.terms.length?`<span class="count">${r.terms.length}</span>`:""}${icon("chevron")}</button>
          <div class="rowActions" role="group" aria-label="Действия: ${escapeText(r.name)}">${cards?rename:""}
            <button class="rowAction quickCopy" type="button" data-action="quick-copy" aria-label="Копировать текст и ссылку" title="Копировать текст и ссылку">${icon("copy")}<span>Копировать</span></button>
            <button class="rowAction quickRevoke" type="button" data-action="ask-revoke" aria-label="Отозвать ссылку" title="Отозвать ссылку" aria-expanded="false" aria-controls="revoke-${r.id}">${icon("revoke")}</button>
          </div>`;
        const type=escapeText(r.type||"Тип не указан"),name=escapeText(r.name),author=escapeText(r.author),date=escapeText(r.date);
        const recipient=r.name!==r.recipient?`<span class="inviteRecipient">Для: ${escapeText(r.recipient)}</span>`:"";
        return `
          <article class="record ${termsOpen?"expanded":""}" data-id="${escapeText(r.id)}" data-type="${typeKey(r.type)}">
          ${cards?`<div class="inviteFace">
            <div class="inviteCardHead"><span class="inviteRibbon">${type}</span>${check}<span class="inviteWordmark" aria-hidden="true">remcard<span>.</span></span></div>
            <div class="inviteFaceName"><div class="inviteName" title="${name}">${name}</div>${recipient}</div>
            <div class="inviteFaceAuthor"><span>Создал приглашение</span><div><strong>${author}</strong> · ${date}</div></div>
            <div class="inviteCardActions">${controls}</div>
          </div>`:
          `<div class="recordTop">${check}<div class="recordLabel">
            <div class="inviteNameLine"><span class="recordTitle inviteName">${name}</span><span class="inviteType">${type}</span>${rename}</div>
            <div class="recordMeta">${recipient?`${recipient} · `:""}<strong class="by">${author}</strong> · ${date}</div>
          </div>${controls}</div>`}
            <p class="srOnly rowStatus" role="status"></p>
            <form class="renameForm" ${editing===r.id?"":"hidden"}>
              <label>Название для себя<input name="name" required maxlength="100" autocomplete="off" value="${escapeText(r.name)}"></label>
              <p>Получатель не увидит это название.</p>
              <div class="confirmActions"><button class="cancel" type="button" data-action="cancel-rename">Отмена</button><button class="primary" type="submit">Сохранить</button></div>
            </form>
          <div class="confirmStrip" id="revoke-${r.id}" hidden>
            <p class="confirmText"><b>Отозвать ссылку?</b><br>Она перестанет работать и исчезнет из активных.</p>
            <div class="confirmActions">
              <button class="cancel" type="button" data-action="cancel-revoke">Отмена</button>
              <button class="primary" type="button" data-action="revoke">Отозвать ссылку</button>
            </div>
          </div>
          <div class="copyFallback" hidden><p>Автокопирование недоступно. Скопируйте выделенный текст.</p><textarea class="url" aria-label="Текст для копирования" readonly></textarea></div>
          <div class="conditionsPane" id="terms-${r.id}" ${termsOpen?"":"hidden"}>
              ${r.terms.length?`<table class="conditionsTable">
              <caption class="srOnly">Условия приглашения по категориям</caption>
              <thead><tr><th scope="col">Товары и услуги</th><th scope="col">Процент</th></tr></thead>
              <tbody>${r.terms.map(([category,rate])=>`<tr><td>${category}</td><td${rate===null?' class="excluded"':''}>${rate??"Не участвует"}</td></tr>`).join("")}</tbody>
              </table>`:`<p class="inviteTermsNote">${escapeText(r.termsNote||"Условия в приглашении не указаны.")}</p>`}
          </div>
        </article>`}).join("")||`<p class="noCopy empty">${query?"Приглашения не найдены. Попробуйте другой запрос.":"Активных ссылок пока нет."}</p>`;
      $("#archive").innerHTML=shownArchive.map(r=>`<article class="archiveRow" data-type="${typeKey(r.type)}"><div class="inviteNameLine"><span class="recordTitle inviteName">${r.recipient}</span><span class="inviteType">${r.type}</span></div><div class="archMeta"><span><b>Пригласил:</b> ${r.author} · ${r.date}</span><span><b>Принято:</b> ${r.accepted}</span></div></article>`).join("")||'<p class="noCopy empty">Приглашения не найдены. Попробуйте другой запрос.</p>';
      refreshSelection();
    }
    render();
    function finishRename(id){
      editing="";render();
      ($(`[data-id="${id}"] .renameInvite`)||$("#inviteSearch")).focus({preventScroll:true});
    }
    $("#active").addEventListener("input",(e)=>{if(e.target.matches(".renameForm input"))e.target.setCustomValidity("");});
    $("#active").addEventListener("submit",(e)=>{
      if(!e.target.matches(".renameForm"))return;
      e.preventDefault();
      const field=e.target.elements.name,row=active.find(r=>r.id===editing),name=field.value.trim();
      if(!row)return;
      field.setCustomValidity(name?"":"Введите название приглашения.");
      if(!field.reportValidity())return;
      row.name=name;
      if(row.cabinet)saveCabinetName(row.id,name);else sampleNames.set(row.id,name);
      finishRename(row.id);
      const status=$(`[data-id="${row.id}"] .rowStatus`);
      if(status)status.textContent="Название сохранено";
    });
    $("#active").addEventListener("keydown",(e)=>{
      if(e.key==="Escape"&&editing&&e.target.closest(".renameForm")){
        e.preventDefault();e.stopPropagation();finishRename(editing);
      }
    });
    $("#active").addEventListener("keydown",(e)=>{if(e.key==="Escape"&&pendingRevoke){e.preventDefault();dismissRevoke(true);}});
    async function copyText(value){
      try{await navigator.clipboard.writeText(value);return true;}catch{}
      const field=document.createElement("textarea"),previous=root.activeElement;
      field.value=value;field.readOnly=true;field.setAttribute("aria-hidden","true");
      field.style.cssText="position:fixed;inset:0 auto auto 0;opacity:0;pointer-events:none";
      root.append(field);field.select();
      let copied=false;
      try{copied=document.execCommand("copy");}catch{}finally{field.remove();previous?.focus({preventScroll:true});}
      return copied;
    }
    $("#active").addEventListener("click",async(e)=>{
      const button=e.target.closest("button");if(!button)return;
      const el=button.closest("[data-id]"),row=active.find(r=>r.id===el?.dataset.id),action=button.dataset.action;
      if(!row)return;
      if(action==="rename"){
        if(editing===row.id){finishRename(row.id);return;}
        dismissRevoke();editing=row.id;render();
        const field=$(`[data-id="${row.id}"] .renameForm input`);
        field.closest("form").scrollIntoView({block:"nearest"});field.focus({preventScroll:true});field.select();return;
      }
      if(action==="cancel-rename"){finishRename(row.id);return;}
      if(action==="terms"){
        dismissRevoke();
        expanded=expanded===row.id?"":row.id;render();
        const record=$(`[data-id="${row.id}"]`);record.querySelector(`[data-action="${action}"]`).focus({preventScroll:true});
        record.scrollIntoView({block:"nearest"});return;
      }
      if(action==="ask-revoke"){
        if(pendingRevoke===row.id){dismissRevoke(true);return;}
        dismissRevoke();pendingRevoke=row.id;button.setAttribute("aria-expanded","true");
        const prompt=el.querySelector(".confirmStrip");prompt.hidden=false;
        prompt.scrollIntoView({block:"nearest"});prompt.querySelector(".cancel").focus({preventScroll:true});return;
      }
      if(action==="cancel-revoke"){dismissRevoke(true);return;}
      if(action==="revoke"&&pendingRevoke===row.id){
        const index=active.indexOf(row);
        if(row.cabinet)revokeCabinet([row.id]);
        if(editing===row.id)editing="";
        dismissRevoke();active=active.filter(r=>r!==row);
        if(expanded===row.id)expanded="";render();
        const next=active[Math.min(index,active.length-1)];
        (next&&$(`[data-id="${next.id}"] .quickRevoke`)|| (query?$("#inviteSearch"):$("#activeTab"))).focus();return;
      }
      if(action!=="quick-copy")return;
      const value=`${row.note}\n\n${row.url}`;
      const copied=await copyText(value);if(!el.isConnected)return;
      const fallback=el.querySelector(".copyFallback");
      if(!copied){
        fallback.hidden=false;const field=fallback.querySelector("textarea");
        field.value=value;field.focus();field.select();return;
      }
      fallback.hidden=true;
      el.querySelector(".rowStatus").textContent="Приглашение скопировано";
      button.dataset.copied="true";button.innerHTML=`${icon("check")}<span>Скопировано</span>`;
      clearTimeout(button.resetCopy);button.resetCopy=setTimeout(()=>{
        button.dataset.copied="false";button.innerHTML=`${icon("copy")}<span>Копировать</span>`;
        el.querySelector(".rowStatus").textContent="";
      },2000);
    });

    this.setCabinetRows=({role,rows,onRename,onRevoke})=>{
      if(!namesByRole.has(role))namesByRole.set(role,new Map());
      sampleNames=namesByRole.get(role);
      for(const row of active)row.name=sampleNames.get(row.id)||row.recipient;
      active=[...rows,...active];
      saveCabinetName=onRename;
      revokeCabinet=onRevoke;
      render();
    };
  }
}
if (!customElements.get("remcard-invitations-preview")) {
  customElements.define("remcard-invitations-preview", RemcardInvitationPreview);
}
