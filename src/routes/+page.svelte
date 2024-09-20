<script lang="ts">
  let userInput = '';
  let chatbotResponse = '';

  function handleSubmit() {
    // This is where we'd typically call an API to get the chatbot's response
    // For now, we'll just echo the user's input
    chatbotResponse = `You said: ${userInput}`;
    userInput = '';
  }
</script>

<main>
  <header>
    <img src="/obb-logo.svg" alt="ÖBB Rail&Drive Logo" class="logo">
    <h1>ÖBB Rail&Drive Chatbot</h1>
  </header>

  <div class="chat-container">
    <div class="chat-output">
      {#if chatbotResponse}
        <p>{chatbotResponse}</p>
      {:else}
        <p>Hello! How can I assist you with ÖBB Rail&Drive today?</p>
      {/if}
    </div>
    <form on:submit|preventDefault={handleSubmit}>
      <input 
        type="text" 
        bind:value={userInput} 
        placeholder="Type your question here..."
      >
      <button type="submit">Send</button>
    </form>
  </div>
</main>

<style>
  :global(body) {
    font-family: 'Open Sans', sans-serif;
    background-color: #f0f0f0;
    margin: 0;
    padding: 0;
  }

  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }

  .logo {
    height: 40px;
    margin-right: 15px;
  }

  h1 {
    color: #0f4b7f;
    font-size: 24px;
  }

  .chat-container {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .chat-output {
    min-height: 200px;
    padding: 20px;
    background-color: #f9f9f9;
    border-bottom: 1px solid #e0e0e0;
  }

  form {
    display: flex;
    padding: 10px;
  }

  input {
    flex-grow: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-right: 10px;
  }

  button {
    background-color: #0f4b7f;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  button:hover {
    background-color: #0d3d66;
  }
</style>
