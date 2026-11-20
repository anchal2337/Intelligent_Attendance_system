import os

file_path = 'src/App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Lecture interface
code = code.replace(
    "interface Lecture { id:string; dept:Dept; subject:string; subIdx:number; date:string; time:string }",
    "export type LecStatus = 'Upcoming'|'In Progress'|'Conducted'|'Cancelled'|'Rescheduled'|'College Event'|'Holiday';\nexport interface Lecture { id:string; dept:Dept; subject:string; subIdx:number; date:string; time:string; status:LecStatus; reason?:string; notes?:string; attendanceMethod?:string; conductedBy?:string; savedAt?:string }"
)

# 2. Update genLectures
code = code.replace(
    "out.push({id:`${dept}-${si}-${ds}`,dept,subject,subIdx:si,date:ds,time:TIMES[ti]})",
    "out.push({id:`${dept}-${si}-${ds}`,dept,subject,subIdx:si,date:ds,time:TIMES[ti],status:(ds<todayStr()?'Conducted':'Upcoming')})"
)
code = code.replace(
    "const ALL_LECS=genLectures()",
    "let ALL_LECS=genLectures()"
)

# 3. Add Voice utility at the top
voice_code = """
// ── VOICE RECOGNITION SERVICE ─────────────────────────────────────────────────
export const VoiceService = {
  listen(onResult: (text: string) => void, onEnd: () => void) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      onEnd();
      return;
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      onResult(text);
    };
    rec.onerror = (e: any) => console.error(e);
    rec.onend = () => onEnd();
    rec.start();
  }
}
"""
code = code.replace("// ── SEEDED RNG", voice_code + "\n// ── SEEDED RNG")

# 4. Modify App state to hold lectures
code = code.replace(
    "const [people,setPeople]=useState<Person[]>(INIT_PEOPLE)",
    "const [people,setPeople]=useState<Person[]>(INIT_PEOPLE)\n  const [lectures,setLectures]=useState<Lecture[]>(ALL_LECS)\n  ALL_LECS = lectures; // hack to share with subcomponents"
)

# update portal props
code = code.replace(
    "<TeacherPortal teacher={teacher} people={people} setPeople={setPeople} onLogout={handleLogout}/>",
    "<TeacherPortal teacher={teacher} people={people} setPeople={setPeople} lectures={lectures} setLectures={setLectures} onLogout={handleLogout}/>"
)
code = code.replace(
    "<AdminPortal people={people} setPeople={setPeople} onLogout={handleLogout}/>",
    "<AdminPortal people={people} setPeople={setPeople} lectures={lectures} setLectures={setLectures} onLogout={handleLogout}/>"
)

code = code.replace(
    "function TeacherPortal({teacher,people,setPeople,onLogout}:{teacher:Teacher;people:Person[];setPeople:React.Dispatch<React.SetStateAction<Person[]>>;onLogout:()=>void}){",
    "function TeacherPortal({teacher,people,setPeople,lectures,setLectures,onLogout}:{teacher:Teacher;people:Person[];setPeople:React.Dispatch<React.SetStateAction<Person[]>>;lectures:Lecture[];setLectures:React.Dispatch<React.SetStateAction<Lecture[]>>;onLogout:()=>void}){"
)
code = code.replace(
    "function AdminPortal({people,setPeople,onLogout}:{people:Person[];setPeople:React.Dispatch<React.SetStateAction<Person[]>>;onLogout:()=>void}){",
    "function AdminPortal({people,setPeople,lectures,setLectures,onLogout}:{people:Person[];setPeople:React.Dispatch<React.SetStateAction<Person[]>>;lectures:Lecture[];setLectures:React.Dispatch<React.SetStateAction<Lecture[]>>;onLogout:()=>void}){"
)


# Re-write the overallPct function to use lectures
pct_old = """function overallPct(p:Person){
  const h=p.history.filter(e=>e.status!=='Leave');if(!h.length)return 0
  const n=h.filter(e=>e.status==='Present'||e.status==='Late').length+h.filter(e=>e.status==='HalfDay').length*.5
  return Math.round((n/h.length)*100)
}"""
pct_new = """function overallPct(p:Person){
  const conducted = ALL_LECS.filter(l => l.dept === p.dept && l.status === 'Conducted');
  if(!conducted.length) return 0;
  let attended = 0;
  for (const l of conducted) {
    const s = p.lectureAtt[l.id];
    if (s === 'Present' || s === 'Late') attended += 1;
    else if (s === 'HalfDay') attended += 0.5;
  }
  return Math.round((attended/conducted.length)*100);
}"""
code = code.replace(pct_old, pct_new)


# Re-write TeacherPortal 'attend' view.
teacher_attend_old = """{view==='attend'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div><h1 style={{fontFamily:F.h,fontSize:24,fontWeight:700,color:T.text,display:'flex',alignItems:'center',gap:7}}><Sparkle size={11}/>Take Attendance</h1><p style={{color:T.muted,fontSize:13,margin:'4px 0 0',fontFamily:F.b}}>Manual subject-wise marking · {DC[teacher.dept].full}</p></div>

        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          {teacher.subjects.map((s,i)=><button key={i} onClick={()=>{setSelSubj(i);setAttLog([])}} style={{padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',fontFamily:F.b,fontWeight:600,fontSize:12,background:selSubj===i?T.primary:T.primaryL,color:selSubj===i?'#fff':T.primary}}>{s}</button>)}
          {!sessionOn?<Btn sm v="sage" onClick={()=>setSessionOn(true)}>Start Session</Btn>:<Btn sm v="danger" onClick={()=>{setSessionOn(false);const pres=attLog.filter(l=>l.status==='Present').length;const abs=myStudents.length-attLog.length;alert(`Session Summary\\n\\n${teacher.subjects[selSubj]}\\n\\nPresent: ${pres}\\nAbsent: ${abs}\\nRate: ${Math.round((pres/Math.max(myStudents.length,1))*100)}%`)}}>End Session</Btn>}
        </div>

        {sessionOn&&<div style={{background:T.primaryL,borderRadius:10,border:`1px solid ${T.border}`,padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontFamily:F.h,fontSize:15,fontWeight:700,color:T.text}}>{teacher.subjects[selSubj]}</div><div style={{fontFamily:F.b,fontSize:11,color:T.muted}}>{DC[teacher.dept].full} · {nowStr()}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontFamily:F.h,fontSize:18,fontWeight:700,color:T.primary}}>{attLog.length}/{myStudents.length}</div><div style={{fontFamily:F.b,fontSize:10,color:T.muted}}>marked</div></div>
        </div>}
        {sessionOn&&<div style={{height:5,background:T.primaryL,borderRadius:5,overflow:'hidden'}}><div style={{height:'100%',width:`${myStudents.length?Math.round((attLog.length/myStudents.length)*100):0}%`,background:T.primary,transition:'width .4s'}}/></div>}

        {toast&&<div className="fade-in" style={{background:T.sageL,borderRadius:9,padding:'8px 14px',fontFamily:F.b,fontSize:13,color:'#166534',fontWeight:600}}>{toast}</div>}

        <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:14}}>
          <Card style={{padding:14}}>
            {!sessionOn&&<div style={{textAlign:'center',padding:'30px 20px',color:T.muted,fontFamily:F.b,fontSize:13}}>Start a session to mark attendance</div>}
            {sessionOn&&<div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:480,overflowY:'auto'}}>
              {myStudents.map(p=>{const marked=attLog.find(l=>l.id===p.id);return(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:9,background:marked?SC[marked.status].bg:T.bg,border:`1px solid ${marked?SC[marked.status].dot+'30':T.border}`}}>
                  <Av av={p.avatar} dept={p.dept} size={26}/>
                  <div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.b,fontWeight:600,fontSize:12,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div><div style={{fontFamily:F.b,fontSize:10,color:T.muted}}>{p.rollNo}{marked?` · Marked ${marked.status} at ${marked.time}`:''}</div></div>
                  {!marked?<div style={{display:'flex',gap:4}}>
                    {(['Present','Late','Absent','HalfDay','Leave'] as DS[]).map(s=><button key={s} onClick={()=>markAtt(p.id,s)} title={s} style={{padding:'4px 8px',borderRadius:7,border:`1px solid ${SC[s].dot}40`,background:SC[s].bg,color:SC[s].text,cursor:'pointer',fontFamily:F.b,fontWeight:700,fontSize:9}}>{s==='Present'?'P':s==='Late'?'L':s==='Absent'?'A':s==='HalfDay'?'H':'Lv'}</button>)}
                  </div>:<button onClick={()=>setAttLog(l=>l.filter(x=>x.id!==p.id))} style={{fontSize:10,fontFamily:F.b,color:T.muted,background:'none',border:`1px solid ${T.border}`,borderRadius:6,padding:'3px 7px',cursor:'pointer'}}>Undo</button>}
                </div>
              )})}
            </div>}
          </Card>
          <Card style={{display:'flex',flexDirection:'column'}}>
            <div style={{padding:'11px 14px',borderBottom:`1px solid ${T.border}`,fontFamily:F.h,fontSize:14,fontWeight:700,color:T.text}}>Live Log</div>
            {attLog.length===0?<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:T.muted,fontFamily:F.b,fontSize:13,flexDirection:'column',gap:6,padding:20}}><Sparkle size={16} color={T.border}/>{sessionOn?'Mark students on the left':'Start session first'}</div>
            :<div style={{flex:1,overflowY:'auto',padding:8,display:'flex',flexDirection:'column',gap:5}}>
              {attLog.map((l,i)=><div key={i} className="fade-in" style={{display:'flex',alignItems:'center',gap:8,padding:'6px 9px',borderRadius:9,background:SC[l.status].bg}}>
                <div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.b,fontWeight:600,fontSize:12,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name}</div><div style={{fontFamily:F.b,fontSize:10,color:T.muted}}>{l.time}</div></div>
                <Bdg s={l.status}/>
              </div>)}
            </div>}
          </Card>
        </div>
      </div>}"""

teacher_attend_new = """{view==='attend'&&<TeacherAttendView teacher={teacher} myStudents={myStudents} lectures={lectures} setLectures={setLectures} setPeople={setPeople} todayLecs={todayLecs} nowStr={nowStr} />}"""
code = code.replace(teacher_attend_old, teacher_attend_new)

# Add TeacherAttendView
attend_comp = """
function TeacherAttendView({teacher, myStudents, lectures, setLectures, setPeople, todayLecs, nowStr}: any) {
  const [selLecId, setSelLecId] = useState<string|null>(null);
  const [listenLec, setListenLec] = useState<string|null>(null);
  const [voiceReasonLec, setVoiceReasonLec] = useState<string|null>(null);
  const [toast, setToast] = useState<string|null>(null);
  
  const selectedLec = lectures.find((l:any) => l.id === selLecId);

  const updateLec = (id: string, updates: any) => {
    setLectures((ls:any) => ls.map((l:any) => l.id === id ? { ...l, ...updates, modifiedBy: teacher.name, modifiedAt: nowStr() } : l));
  };

  const markStudent = (studentId: string, status: string, lecId: string) => {
    setPeople((ps:any) => ps.map((p:any) => {
      if(p.id !== studentId) return p;
      return { ...p, lectureAtt: { ...p.lectureAtt, [lecId]: status } };
    }));
  };

  const markAll = (status: string, lecId: string) => {
    setPeople((ps:any) => ps.map((p:any) => {
      if(p.dept !== teacher.dept || p.category !== 'Student') return p;
      return { ...p, lectureAtt: { ...p.lectureAtt, [lecId]: status } };
    }));
    setToast(`Marked all ${status}`);
    setTimeout(() => setToast(null), 2000);
  };

  const saveAttendance = (lec: any) => {
    updateLec(lec.id, { status: 'Conducted', conductedBy: teacher.name, savedAt: nowStr() });
    setSelLecId(null);
    setToast(`Saved ${lec.subject} attendance.`);
    setTimeout(() => setToast(null), 3000);
  };

  const setException = (lec: any, status: string, reason: string = '') => {
    updateLec(lec.id, { status, reason, conductedBy: teacher.name });
  };
  
  const startVoiceReason = (lec: any) => {
    setVoiceReasonLec(lec.id);
    VoiceService.listen((text) => {
      updateLec(lec.id, { status: 'Cancelled', reason: text, conductedBy: teacher.name });
      setVoiceReasonLec(null);
      setToast('Voice added: ' + text);
      setTimeout(()=>setToast(null),3000);
    }, () => setVoiceReasonLec(null));
  };
  
  const startVoiceAtt = (lec: any) => {
    setListenLec(lec.id);
    updateLec(lec.id, { attendanceMethod: 'Voice' });
    VoiceService.listen((text) => {
      const lower = text.toLowerCase();
      const status = lower.includes('absent') ? 'Absent' : 'Present';
      const student = myStudents.find((s:any) => lower.includes(s.name.toLowerCase()) || lower.includes(s.rollNo.toLowerCase()) || lower.includes(s.rollNo.slice(-2)));
      if (student) {
        if (confirm(`Did you mean ${student.name}? Mark ${status}?`)) {
           markStudent(student.id, status, lec.id);
           setToast(`Marked ${student.name} ${status}`);
           setTimeout(()=>setToast(null),3000);
        }
      } else {
         alert(`Could not match student from: "${text}"`);
      }
      setListenLec(null);
    }, () => setListenLec(null));
  };

  if (selLecId && selectedLec) {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
         <button onClick={() => setSelLecId(null)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:12,fontFamily:F.b,textAlign:'left'}}>← Back to Classes</button>
         <div><h1 style={{fontFamily:F.h,fontSize:24,fontWeight:700,color:T.text}}>{selectedLec.subject}</h1><p style={{color:T.muted,fontSize:13,margin:'4px 0 0',fontFamily:F.b}}>{selectedLec.time} · {selectedLec.status}</p></div>
         <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Btn sm v="sage" onClick={() => markAll('Present', selectedLec.id)}>Mark All Present</Btn>
            <Btn sm v="danger" onClick={() => markAll('Absent', selectedLec.id)}>Mark All Absent</Btn>
            <Btn sm v="ghost" onClick={() => startVoiceAtt(selectedLec)}>
               {listenLec === selectedLec.id ? 'Listening...' : '🎤 Start Voice Attendance'}
            </Btn>
            <Btn sm onClick={() => saveAttendance(selectedLec)}>Save Attendance</Btn>
         </div>
         {toast&&<div className="fade-in" style={{background:T.sageL,borderRadius:9,padding:'8px 14px',fontFamily:F.b,fontSize:13,color:'#166534',fontWeight:600}}>{toast}</div>}
         
         <div style={{maxHeight: 500, overflowY: 'auto', display:'flex', flexDirection:'column', gap:6}}>
             {myStudents.map((p:any) => {
                const marked = p.lectureAtt[selectedLec.id];
                return (
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:9,background:marked?SC[marked as DS].bg:T.bg,border:`1px solid ${marked?SC[marked as DS].dot+'30':T.border}`}}>
                    <Av av={p.avatar} dept={p.dept} size={26}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.b,fontWeight:600,fontSize:12,color:T.text}}>{p.name}</div><div style={{fontFamily:F.b,fontSize:10,color:T.muted}}>{p.rollNo}</div></div>
                    <div style={{display:'flex',gap:4}}>
                      {(['Present','Late','Absent','HalfDay','Leave']).map(s=><button key={s} onClick={()=>markStudent(p.id, s, selectedLec.id)} title={s} style={{padding:'4px 8px',borderRadius:7,border:`1px solid ${SC[s as DS].dot}40`,background:marked===s?SC[s as DS].bg:T.bg,color:marked===s?SC[s as DS].text:T.muted,cursor:'pointer',fontFamily:F.b,fontWeight:700,fontSize:9}}>{s==='Present'?'P':s==='Late'?'L':s==='Absent'?'A':s==='HalfDay'?'H':'Lv'}</button>)}
                    </div>
                  </div>
                )
             })}
         </div>
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div><h1 style={{fontFamily:F.h,fontSize:24,fontWeight:700,color:T.text,display:'flex',alignItems:'center',gap:7}}><Sparkle size={11}/>Today's Classes</h1><p style={{color:T.muted,fontSize:13,margin:'4px 0 0',fontFamily:F.b}}>Automated schedule · Click to take attendance</p></div>
      {toast&&<div className="fade-in" style={{background:T.sageL,borderRadius:9,padding:'8px 14px',fontFamily:F.b,fontSize:13,color:'#166534',fontWeight:600}}>{toast}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
         {todayLecs.map((l:any) => {
            const isDone = l.status === 'Conducted' || l.status === 'Cancelled' || l.status === 'College Event';
            return (
              <Card key={l.id} style={{padding: 16, borderLeft: `4px solid ${isDone ? T.sage : T.primary}`}}>
                 <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                       <div style={{fontFamily:F.h,fontSize:18,fontWeight:700,color:T.text}}>{l.subject}</div>
                       <div style={{fontFamily:F.b,fontSize:12,color:T.muted}}>{l.time} · {l.status} {l.reason ? ` - ${l.reason}`:''}</div>
                       {l.conductedBy && <div style={{fontFamily:F.b,fontSize:10,color:T.muted,marginTop:4}}>Updated by {l.conductedBy} at {l.savedAt || l.modifiedAt}</div>}
                    </div>
                    {!isDone ? (
                      <div style={{display:'flex', gap:6, flexDirection:'column'}}>
                         <Btn sm onClick={() => { setSelLecId(l.id); updateLec(l.id, {status: 'In Progress'}) }}>Take Attendance</Btn>
                         <Btn sm v="danger" onClick={() => startVoiceReason(l)}>{voiceReasonLec === l.id ? 'Listening...' : '🎤 Cancel/Reschedule'}</Btn>
                         <button onClick={() => setException(l, 'College Event')} style={{fontSize:10,fontFamily:F.b,color:T.muted,background:'none',border:'none',cursor:'pointer',textAlign:'right',textDecoration:'underline'}}>Mark College Event</button>
                      </div>
                    ) : (
                      <div style={{display:'flex', gap:6, flexDirection:'column'}}>
                         <div style={{fontFamily:F.b,fontSize:13,color:T.sage,fontWeight:700,textAlign:'right'}}>✓ Recorded</div>
                         <Btn sm v="ghost" onClick={() => setSelLecId(l.id)}>Edit Attendance</Btn>
                      </div>
                    )}
                 </div>
              </Card>
            )
         })}
      </div>
    </div>
  )
}
"""

code = code.replace("// ── TEACHER PORTAL", attend_comp + "\n// ── TEACHER PORTAL")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)
