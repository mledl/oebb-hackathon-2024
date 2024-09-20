<script lang="ts">
  import { onMount } from 'svelte';

  interface Message {
    text: string;
    isUser: boolean;
    username: string;
  }

  let userInput = '';
  let conversation: Message[] = [];
  let chatContainer: HTMLElement;

  onMount(() => {
    conversation = [
      { text: "Hello! How can I assist you with ÖBB Rail&Drive today?", isUser: false, username: "Railey" }
    ];
  });

  async function handleSubmit() {
    if (!userInput.trim()) return;

    const userMessage = userInput.trim();
    conversation = [...conversation, { text: userMessage, isUser: true, username: "Ridey" }];
    userInput = '';

    const response = await fetch('api/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userMessage })
    });

    const data = await response.json();
    conversation = [...conversation, { text: data.aiMessage, isUser: false, username: "Railey" }];

    // Scroll to bottom of chat
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 0);
  }
</script>

<main>
  <header>
    <img src="/oebb-logo.jpg" alt="ÖBB Rail&Drive Logo" class="logo">
    <h1>ÖBB Rail&Drive Chatbot</h1>
  </header>

  <div class="chat-container" bind:this={chatContainer}>
    {#each conversation as message}
      <div class="message {message.isUser ? 'user' : 'bot'}">
        <div class="username">{message.username}</div>
        <div class="bubble">
          {message.text}
        </div>
      </div>
    {/each}
  </div>

  <form on:submit|preventDefault={handleSubmit}>
    <input 
      type="text" 
      bind:value={userInput} 
      placeholder="Type your question here..."
    >
    <button type="submit">Send</button>
  </form>
</main>

<style>
  :global(body) {
    font-family: 'Open Sans', sans-serif;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }

  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  header {
    display: flex;
    align-items: center;
    background-color: #0c2340;
    padding: 15px;
    border-radius: 8px 8px 0 0;
  }

  .logo {
    height: 30px;
    margin-right: 15px;
  }

  h1 {
    color: #ffffff;
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }

  .chat-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 20px;
    background-color: #f2f2f2;
    border: 1px solid #e0e0e0;
    border-top: none;
  }

  .message {
    display: flex;
    flex-direction: column;
    margin-bottom: 15px;
  }

  .user {
    align-items: flex-end;
  }

  .username {
    font-size: 14px;
    margin-bottom: 5px;
    font-weight: bold;
  }

  .user .username {
    color: #cc0033;
  }

  .bot .username {
    color: #0c2340;
  }

  .bubble {
    max-width: 70%;
    padding: 10px 15px;
    border-radius: 18px;
    font-size: 16px;
    line-height: 1.4;
  }

  .user .bubble {
    background-color: #cc0033;
    color: white;
    border-bottom-right-radius: 4px;
  }

  .bot .bubble {
    background-color: #ffffff;
    color: #333333;
    border-bottom-left-radius: 4px;
  }

  form {
    display: flex;
    padding: 15px;
    background-color: #f2f2f2;
    border: 1px solid #e0e0e0;
    border-top: none;
    border-radius: 0 0 8px 8px;
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
