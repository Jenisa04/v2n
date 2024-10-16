import torch
import sys
import os
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import warnings

# Suppress FutureWarnings
warnings.filterwarnings("ignore", category=FutureWarning)

def suppress_stdout_stderr():
    """Suppress stdout and stderr"""
    sys.stdout = open(os.devnull, 'w')
    sys.stderr = open(os.devnull, 'w')

def restore_stdout_stderr():
    """Restore stdout and stderr"""
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__

def transcribe_audio(audio_file_path):
    # Suppress the specific message during the loading of the model
    suppress_stdout_stderr()
    try:
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        model_id = "openai/whisper-large-v3-turbo"

        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_id, torch_dtype=torch_dtype, low_cpu_mem_usage=True, use_safetensors=True
        )
        model.generation_config.language = "en"  # define your language of choice here
        model.to(device)

        processor = AutoProcessor.from_pretrained(model_id)

        pipe = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            torch_dtype=torch_dtype,
            device=device,
        )
    finally:
        # Restore stdout and stderr
        restore_stdout_stderr()

    # Process the audio file
    result = pipe(audio_file_path)
    return result

if __name__ == "__main__":
    audio_file_path = sys.argv[1]
    res = transcribe_audio(audio_file_path)
    print(res["text"])
