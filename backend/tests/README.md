# Backend Tests

This directory contains tests for the backend application, focusing on the OpenAI integration and API routes.

## Test Types

The test suite includes:

1. **Unit Tests** - Tests that mock API responses to verify function logic without making actual API calls
2. **Integration Tests** - Tests that make actual API calls to verify our integration with external services
3. **Route Tests** - Tests for API endpoints to ensure they properly handle requests and responses

## Prerequisites

To run the tests, install the required packages:

```bash
pip install pytest pytest-asyncio numpy httpx
```

## Running Tests

### Running All Tests

To run all tests:

```bash
python -m pytest
```

### Running Specific Test Files

To run a specific test file:

```bash
python -m pytest tests/test_openai_service.py
```

### Running Tests with Verbosity

For more detailed output:

```bash
python -m pytest tests/test_speech_routes.py -v
```

### Running Individual Tests

To run a specific test:

```bash
python -m pytest tests/test_openai_service.py::TestOpenAIServiceMocked::test_speech_to_text_mocked
```

### OpenAI Integration Tests

By default, some OpenAI integration tests that make actual API calls are skipped. To enable them:

```bash
ENABLE_OPENAI_INTEGRATION_TESTS=true python -m pytest tests/test_openai_integration.py
```

## Quick Test Script

The project includes a test script (`test_openai.py`) that can be used to quickly test different OpenAI features:

```bash
# Test GPT with a prompt
python test_openai.py --gpt "What is the capital of France?"

# Test text-to-speech
python test_openai.py --tts "This is a test of the OpenAI text-to-speech system."

# Test speech-to-text (requires an audio file)
python test_openai.py --stt audio_file.mp3

# Generate audio from speech-to-text-to-speech pipeline
python test_openai.py --generate audio_file.mp3
```

## Troubleshooting

If tests fail, check the following:

1. **OpenAI API Key**: Ensure your OpenAI API key is set correctly in the environment or .env file
2. **API Credits**: Check if you have available credits on your OpenAI account
3. **Rate Limiting**: If running many tests, you might hit rate limits. Add delays between tests or run fewer tests
4. **Environment**: Make sure you're using the correct virtual environment with all dependencies installed
5. **Async/Await**: For tests involving async functions, ensure proper use of async/await and AsyncMock
