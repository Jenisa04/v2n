import torch
import sys
import os
import time
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import warnings

# Suppress FutureWarnings
warnings.filterwarnings("ignore", category=FutureWarning)

def transcribe_audio(audio_file_path):
    """
    Transcribes an audio file using Hugging Face's Whisper small model.
    """
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    model_id = "openai/whisper-small"  # Use the smaller Whisper model

    # Load model and processor
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_id, 
        torch_dtype=torch_dtype, 
        low_cpu_mem_usage=True
    )

    model.generation_config.language = "en"  # define your language of choice here
    model.to(device)
    processor = AutoProcessor.from_pretrained(model_id)

    # Set up the pipeline for ASR (Automatic Speech Recognition)
    pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch_dtype,
        device=device
    )

    # Transcribe audio file
    result = pipe(audio_file_path)
    
    return result["text"]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <path_to_audio_file>")
        sys.exit(1)

    audio_file_path = sys.argv[1]

    if not os.path.exists(audio_file_path):
        print(f"Error: Audio file '{audio_file_path}' does not exist.")
        sys.exit(1)
    start_time = time.time()
    transcription = transcribe_audio(audio_file_path)
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"{transcription}")
    print(f"\nTime taken: {duration:.2f} seconds")
    