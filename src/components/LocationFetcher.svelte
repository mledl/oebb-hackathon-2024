<script>
  import { onMount } from 'svelte';
  export let userLocation = { lat: null, lon: null };

  onMount(async () => {
    try {
      const location = await getUserLocation();
      userLocation = { ...location };
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  });

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
        reject(new Error("Geolocation not supported."));
      }
    });
  }
</script>


