export function useSpeech(lang: string) {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  const recognition = SpeechRecognition
    ? new SpeechRecognition()
    : null;

  let transcript = "";
  let hasSpoken = false;

  if (recognition) {
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (e: any) => {
      transcript += " " + e.results[0][0].transcript;
      hasSpoken = true;
    };
  }

  return {
    start: () => recognition && recognition.start(),
    stop: () => recognition && recognition.stop(),
    get transcript() {
      return transcript.trim();
    },
    get hasSpoken() {
      return hasSpoken;
    },
  };
}
