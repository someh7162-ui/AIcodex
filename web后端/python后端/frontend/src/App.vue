<script setup>
</script>

<template>
  <div class="container">
    <header>
      <h1>My Application</h1>
      <nav>
        <router-link to="/login">Login</router-link> |
        <router-link to="/register">Register</router-link>
      </nav>
    </header>

    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<style>
/* Simple CSS Reset and Base Styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f0f2f5;
  color: #333;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

header {
  margin-bottom: 2rem;
}

nav a {
  text-decoration: none;
  color: #42b983;
  font-weight: bold;
  margin: 0 10px;
}

nav a.router-link-active {
  color: #35495e;
}
</style>
