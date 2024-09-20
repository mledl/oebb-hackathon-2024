<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import LoadingAnimation from '../components/LoadingAnimation.svelte';
  import LocationFetcher from '../components/LocationFetcher.svelte';

  interface Message {
    text: string;
    isUser: boolean;
    username: string;
  }

  let userInput = '';
  let conversation: Message[] = [];
  let chatContainer: HTMLElement;
  let isLoading = false;
  let userLocation = { lat: null, lon: null }; // Ensure userLocation is initialized globally

  // Get the user's location
  async function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({ lat: position.coords.latitude, lon: position.coords.longitude });
          },
          (error) => {
            reject(error);
          }
        );
      } else {
        reject(new Error('Geolocation not supported.'));
      }
    });
  }

  // Fetch user location on page mount
  onMount(async () => {
    try {
      userLocation = await getUserLocation();
      conversation = [
        { text: "Hello! How can I assist you with ÖBB Rail&Drive today?", isUser: false, username: "Railey" }
      ];
    } catch (error) {
      console.error('Error fetching location: ', error);
    }
  });

  async function handleSubmit() {
    if (!userInput.trim()) return;

    const userMessage = userInput.trim();
    conversation = [...conversation, { text: userMessage, isUser: true, username: "Ridey" }];
    userInput = '';
    isLoading = true;

    // Scroll to bottom of chat
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 0);

    try {
      // Ensure that the location is available before sending the request
      if (!userLocation.lat || !userLocation.lon) {
        userLocation = await getUserLocation(); // Fetch again if not already available
      }

      // Send the message along with the location data
      const response = await fetch('/api/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userMessage, userLocation }) // Pass the location data
      });

      const data = await response.json();
      isLoading = false;
      conversation = [...conversation, { text: data.aiMessage, isUser: false, username: "Railey" }];
    } catch (error) {
      console.error('Error in handleSubmit: ', error);
    }

    // Scroll to bottom of chat again after receiving the response
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 0);
  }

  // Render markdown with sanitization
  function renderMarkdown(text: string): string {
    const rawHtml = marked(text);
    return DOMPurify.sanitize(rawHtml);
  }
</script>

<main>
  <header>
    <img src="/oebb-logo.jpg" alt="ÖBB Rail&Drive Logo" class="logo">
    <h1>ÖBB Rail&Drive Chatbot</h1>
  </header>

  

  <LocationFetcher />

  <div class="chat-container" bind:this={chatContainer}>
    {#each conversation as message}
      <div class="message {message.isUser ? 'user' : 'bot'}">
        <div class="username">{message.username}</div>
        <div class="bubble">
          {@html renderMarkdown(message.text)}
        </div>
      </div>
    {/each}
    {#if isLoading}
      <div class="message bot">
        <div class="username">Railey</div>
        <div class="bubble loading">
          <LoadingAnimation color="#0c2340" />
        </div>
      </div>
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

  .bot .bubble.loading {
    background-color: #f2f2f2;
    border: 1px solid #e0e0e0;
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

  /* Markdown styles */
  .bubble :global(p) {
    margin: 0 0 10px 0;
  }

  .bubble :global(p:last-child) {
    margin-bottom: 0;
  }

  .bubble :global(a) {
    color: #0066cc;
    text-decoration: none;
  }

  .bubble :global(a:hover) {
    text-decoration: underline;
  }

  .bubble :global(ul), .bubble :global(ol) {
    margin: 0 0 10px 0;
    padding-left: 20px;
  }

  .bubble :global(li) {
    margin-bottom: 5px;
  }

  .bubble :global(code) {
    background-color: #f0f0f0;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
  }

  .bubble :global(pre) {
    background-color: #f0f0f0;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }

  .bubble :global(pre code) {
    background-color: transparent;
    padding: 0;
  }

  .bubble :global(blockquote) {
    border-left: 4px solid #ccc;
    margin: 0 0 10px 0;
    padding-left: 10px;
    color: #666;
  }

  .bubble :global(table) {
    border-collapse: collapse;
    margin-bottom: 10px;
  }

  .bubble :global(th), .bubble :global(td) {
    border: 1px solid #ccc;
    padding: 8px;
  }

  .bubble :global(th) {
    background-color: #f0f0f0;
    font-weight: bold;
  }
</style>
