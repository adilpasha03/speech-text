import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function App() {

  const [recording, setRecording] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [search, setSearch] = useState("")

  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  // FETCH HISTORY
  const fetchHistory = async () => {
    try {

      const res = await fetch("http://localhost:5000/history")
      const data = await res.json()

      if (Array.isArray(data)) {
        setHistory(data)
      }

    } catch (err) {
      console.log("History error:", err)
    }

    setLoadingHistory(false)
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  // RECORD
  const startRecording = async () => {

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const recorder = new MediaRecorder(stream)

      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => chunksRef.current.push(e.data)

      recorder.onstop = async () => {

        const blob = new Blob(chunksRef.current, { type: "audio/webm" })

        const formData = new FormData()
        formData.append("audio", blob, "recording.webm")

        sendAudio(formData)

      }

      recorder.start()
      setRecording(true)

    } catch {

      alert("Microphone permission denied")

    }

  }

  const stopRecording = () => {

    if (recorderRef.current) {
      recorderRef.current.stop()
      setRecording(false)
    }

  }

  // UPLOAD
  const uploadFile = e => {

    const file = e.target.files[0]

    if (!file) return

    setFileName(file.name)

    const formData = new FormData()
    formData.append("audio", file)

    sendAudio(formData)

  }

  // SEND AUDIO
  const sendAudio = async formData => {

    try {

      setLoading(true)

      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData
      })

      const data = await res.json()

      if (data.transcription) {
        setTranscription(data.transcription)
      }

      fetchHistory()

    } catch {

      alert("Speech to text failed")

    }

    setLoading(false)

  }

  // DELETE
  const deleteItem = async id => {

    await fetch(`http://localhost:5000/delete/${id}`, {
      method: "DELETE"
    })

    fetchHistory()

  }

  // DOWNLOAD
  const downloadText = text => {

    const blob = new Blob([text], { type: "text/plain" })

    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "transcription.txt"

    a.click()

  }

  const filteredHistory = history.filter(item =>
    item.transcription.toLowerCase().includes(search.toLowerCase())
  )

  return (

    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#020617] to-black text-white p-8">

      {/* HEADER */}

      <motion.div
        initial={{ opacity:0, y:-20 }}
        animate={{ opacity:1, y:0 }}
        className="mb-12"
      >

        <h1 className="text-4xl font-bold text-blue-400">
          VoiceScribe AI
        </h1>

        <p className="text-gray-400">
          Intelligent Speech-to-Text Transcription
        </p>

      </motion.div>

      <div className="grid lg:grid-cols-2 gap-10">

        {/* LEFT SIDE */}

        <div className="space-y-8">

          {/* AUDIO PANEL */}

          <motion.div
            initial={{ opacity:0, x:-30 }}
            animate={{ opacity:1, x:0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl"
          >

            <h2 className="text-xl mb-6 text-blue-400">
              Audio Input
            </h2>

            {!recording ? (

              <motion.button
                whileHover={{ scale:1.05 }}
                whileTap={{ scale:0.95 }}
                onClick={startRecording}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 py-10 rounded-xl text-lg font-semibold shadow-lg"
              >
                🎤 Start Recording
              </motion.button>

            ) : (

              <motion.button
                animate={{ scale:[1,1.1,1] }}
                transition={{ repeat:Infinity, duration:1 }}
                onClick={stopRecording}
                className="w-full bg-red-500 py-10 rounded-xl text-lg font-semibold"
              >
                ⏹ Stop Recording
              </motion.button>

            )}

            {/* RECORDING WAVES */}

            {recording && (
              <div className="flex justify-center gap-2 mt-6">
                {[...Array(5)].map((_,i)=>(
                  <motion.div
                    key={i}
                    animate={{ height:[10,30,10] }}
                    transition={{ repeat:Infinity, duration:0.8, delay:i*0.1 }}
                    className="w-2 bg-red-400 rounded"
                  />
                ))}
              </div>
            )}

            {/* UPLOAD */}

            <label className="block border border-dashed border-gray-600 mt-6 p-6 rounded-xl text-center cursor-pointer hover:bg-white/5 transition">

              Upload Audio File

              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={uploadFile}
              />

            </label>

            <p className="text-gray-400 text-sm mt-3">
              {fileName || "No audio selected"}
            </p>

          </motion.div>

          {/* HISTORY */}

          <motion.div
            initial={{ opacity:0, x:-30 }}
            animate={{ opacity:1, x:0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl"
          >

            <div className="flex justify-between mb-4">

              <h2 className="text-purple-400 font-semibold">
                History
              </h2>

              <span className="text-gray-400 text-sm">
                {history.length} items
              </span>

            </div>

            {/* SEARCH */}

            <input
              placeholder="Search history..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
              className="w-full mb-4 p-2 rounded bg-black/40 border border-white/10"
            />

            {loadingHistory ? (

              <p className="text-gray-400">Loading history...</p>

            ) : (

              <div className="space-y-4 max-h-80 overflow-y-auto">

                <AnimatePresence>

                  {filteredHistory.map(item => (

                    <motion.div
                      key={item._id}
                      initial={{ opacity:0, y:10 }}
                      animate={{ opacity:1, y:0 }}
                      whileHover={{ scale:1.02 }}
                      className="bg-[#0f172a] border border-white/10 p-4 rounded-xl"
                    >

                      <p className="text-sm">
                        {item.transcription}
                      </p>

                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>

                      <audio controls className="mt-2 w-full">
                        <source src={`http://localhost:5000${item.filepath}`} />
                      </audio>

                      <div className="flex gap-3 mt-3">

                        <button
                          onClick={()=>downloadText(item.transcription)}
                          className="text-xs bg-blue-500 px-3 py-1 rounded hover:bg-blue-600"
                        >
                          Download
                        </button>

                        <button
                          onClick={()=>deleteItem(item._id)}
                          className="text-xs bg-red-500 px-3 py-1 rounded hover:bg-red-600"
                        >
                          Delete
                        </button>

                      </div>

                    </motion.div>

                  ))}

                </AnimatePresence>

              </div>

            )}

          </motion.div>

        </div>

        {/* RIGHT PANEL */}

        <motion.div
          initial={{ opacity:0, x:30 }}
          animate={{ opacity:1, x:0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl"
        >

          <h2 className="text-xl mb-6 text-blue-400">
            Transcription
          </h2>

          {loading ? (

            <motion.div
              animate={{ rotate:360 }}
              transition={{ repeat:Infinity, duration:1 }}
              className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full mx-auto"
            />

          ) : transcription ? (

            <motion.p
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              className="text-lg leading-relaxed"
            >
              {transcription}
            </motion.p>

          ) : (

            <p className="text-gray-400 text-center mt-20">
              Record or upload audio to see transcription
            </p>

          )}

        </motion.div>

      </div>

    </div>
  )
}