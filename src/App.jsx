import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Mic, UploadCloud, Copy, Trash2, FileDown } from "lucide-react"
import { jsPDF } from "jspdf"

export default function App(){

const [recording,setRecording]=useState(false)
const [transcription,setTranscription]=useState("")
const [history,setHistory]=useState([])
const [status,setStatus]=useState("Awaiting Signal")
const [loading,setLoading]=useState(false)
const [fileName,setFileName]=useState("")

const recorderRef=useRef(null)
const chunksRef=useRef([])


// FETCH HISTORY
const fetchHistory=async()=>{
try{
const res=await fetch("http://localhost:5000/history")
const data=await res.json()
if(Array.isArray(data)) setHistory(data)
}catch(err){console.log(err)}
}

useEffect(()=>{fetchHistory()},[])


// RECORDING
const startRecording=async()=>{
try{
const stream=await navigator.mediaDevices.getUserMedia({audio:true})
const recorder=new MediaRecorder(stream)

recorderRef.current=recorder
chunksRef.current=[]

recorder.ondataavailable=e=>chunksRef.current.push(e.data)

recorder.onstop=()=>{
const blob=new Blob(chunksRef.current,{type:"audio/webm"})
const formData=new FormData()
formData.append("audio",blob,"recording.webm")
sendAudio(formData)
}

recorder.start()
setRecording(true)
setStatus("Recording")

}catch{
alert("Microphone permission denied")
}
}

const stopRecording=()=>{
recorderRef.current.stop()
setRecording(false)
setStatus("Processing")
}


// UPLOAD
const uploadFile=e=>{
const file=e.target.files[0]
if(!file)return

setFileName(file.name)

const formData=new FormData()
formData.append("audio",file)

sendAudio(formData)
}


// SEND AUDIO
const sendAudio=async(formData)=>{
try{

setLoading(true)

const res=await fetch("http://localhost:5000/upload",{
method:"POST",
body:formData
})

const data=await res.json()

if(data.transcription){
setTranscription(data.transcription)
setStatus("Completed")
}

fetchHistory()

}catch{
alert("Speech recognition failed")
}

setLoading(false)
}


// DELETE
const deleteItem=async(id)=>{
await fetch(`http://localhost:5000/delete/${id}`,{method:"DELETE"})
fetchHistory()
}


// COPY TEXT
const copyText=()=>{
navigator.clipboard.writeText(transcription)
}


// DOWNLOAD PDF
const downloadPDF=()=>{
const pdf=new jsPDF()
pdf.text(transcription||"No transcription",10,10)
pdf.save("transcription.pdf")
}


// DOWNLOAD TXT
const downloadTxt=text=>{
const blob=new Blob([text],{type:"text/plain"})
const a=document.createElement("a")
a.href=URL.createObjectURL(blob)
a.download="transcription.txt"
a.click()
}


return(

<div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#020617] to-[#0f172a] text-white">


{/* NAVBAR */}

<nav className="flex justify-between items-center px-4 md:px-8 py-4 border-b border-white/10 backdrop-blur-xl bg-black/30">

<h1 className="text-lg md:text-xl font-bold text-purple-400">
SpeechScribe
</h1>

<div className="text-gray-400 text-sm md:text-base">
Studio
</div>

</nav>



{/* HERO */}

<div className="max-w-7xl mx-auto p-4 md:p-8">

<span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs">
AI Pipeline Ready
</span>

<h1 className="text-2xl md:text-4xl font-bold mt-4">
AI Speech Recognition & Transcription
</h1>

<p className="text-gray-400 mt-2 text-sm md:text-base">
Convert spoken audio into accurate text using advanced AI speech recognition.
</p>



{/* GRID */}

<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">



{/* LEFT PANEL */}

<div className="space-y-6">


{/* STATUS */}

<div className="text-sm text-purple-400">
Status: {status}
</div>


{/* RECORD BUTTON */}

<motion.button
whileHover={{scale:1.05}}
whileTap={{scale:0.95}}
onClick={recording?stopRecording:startRecording}
className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm md:text-base
${recording?"bg-red-500":"bg-gradient-to-r from-purple-500 to-blue-500"}`}
>

<Mic/>

{recording?"Stop Recording":"Start Recording"}

</motion.button>



{/* RECORDING ANIMATION */}

{recording && (
<div className="flex justify-center gap-2">
{[...Array(5)].map((_,i)=>(
<motion.div
key={i}
animate={{height:[10,30,10]}}
transition={{repeat:Infinity,duration:0.8,delay:i*0.1}}
className="w-2 bg-red-400 rounded"
/>
))}
</div>
)}



{/* UPLOAD CARD */}

<label className="border-2 border-dashed border-white/20 p-6 md:p-8 rounded-xl flex flex-col items-center cursor-pointer hover:border-purple-500 transition">

<UploadCloud size={36} className="text-purple-400 mb-2"/>

<p className="text-gray-300 text-sm md:text-base">Upload Audio</p>

<p className="text-xs text-gray-500">MP3 • WAV • M4A</p>

<input
type="file"
accept="audio/*"
className="hidden"
onChange={uploadFile}
/>

</label>

<p className="text-gray-400 text-sm">
{fileName||"No audio selected"}
</p>



{/* HISTORY */}

<div className="bg-white/5 border border-white/10 rounded-xl p-4 max-h-80 overflow-y-auto">

<h2 className="text-purple-400 mb-4">History</h2>

{history.map(item=>(

<div key={item._id} className="bg-[#0f172a] p-3 rounded-lg mb-3">

<p className="text-sm">{item.transcription}</p>

<p className="text-xs text-gray-400 mt-1">
{new Date(item.createdAt).toLocaleString()}
</p>

<audio controls className="mt-2 w-full">
<source src={`http://localhost:5000${item.filepath}`} />
</audio>

<div className="flex gap-2 mt-2">

<button
onClick={()=>downloadTxt(item.transcription)}
className="text-xs bg-blue-500 px-2 py-1 rounded"
>
<FileDown size={14}/>
</button>

<button
onClick={()=>deleteItem(item._id)}
className="text-xs bg-red-500 px-2 py-1 rounded"
>
<Trash2 size={14}/>
</button>

</div>

</div>

))}

</div>

</div>



{/* RIGHT PANEL */}

<div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col min-h-[300px]">

<div className="flex justify-between mb-4">

<h2 className="text-purple-400">
Live Transcript
</h2>

<div className="flex gap-3">

<button onClick={copyText}>
<Copy size={18}/>
</button>

<button onClick={downloadPDF}>
<FileDown size={18}/>
</button>

</div>

</div>

<div className="flex-1 overflow-y-auto text-gray-200 leading-relaxed text-sm md:text-base">

{loading ? (
<motion.div
animate={{rotate:360}}
transition={{repeat:Infinity,duration:1}}
className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto"
/>
) : (
transcription || "Awaiting signal..."
)}

</div>

</div>

</div>

</div>

</div>

)

}