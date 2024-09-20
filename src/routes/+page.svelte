<script lang="ts">
  let userInput = '';
  let chatbotResponse = '';

  async function handleSubmit() {
    const response = await fetch('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: userInput })
    });

    const data = await response.json();
    chatbotResponse = data.reply;
    userInput = '';
  }
</script>

<main>
  <header>
    <img src="/oebb-logo.jpg" alt="ÖBB Rail&Drive Logo" class="logo">
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
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  header {
    display: flex;
    align-items: center;
    margin-bottom: 30px;
    background-color: #0c2340;
    padding: 15px;
    border-radius: 8px;
  }

  .logo {
    height: 30px;
    margin-right: 15px;
  }

  h1 {
    color: #ffffff;
    font-size: 24px;
    font-weight: 600;
  }

  .chat-container {
    background-color: #f2f2f2;
    border-radius: 8px;
    overflow: hidden;
  }

  .chat-output {
    min-height: 200px;
    padding: 20px;
    background-color: #ffffff;
    border-bottom: 1px solid #e0e0e0;
  }

  form {
    display: flex;
    padding: 15px;
    background-color: #f2f2f2;
  }

  input {
    flex-grow: 1;
    padding: 12px;
    border: 1px solid #cccccc;
    border-radius: 4px;
    margin-right: 10px;
    font-size: 16px;
  }

  button {
    background-color: #cc0033;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
    font-size: 16px;
    font-weight: 600;
  }

  button:hover {
    background-color: #a3002a;
  }
</style>
