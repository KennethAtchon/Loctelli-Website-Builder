The website builder has been deprecated. It serves as a nice proof of concept but I wasn't able to get it to actually work for
- Nextjs
- Vite
Applications. It worked for static files, which is good enough proof. 

Now the website builder is very infrastructure heavy (requiring me to spin up docker containers on a per user basis and do alot of code checking for malicious code if I were ever to develop this to production).

This project taught me alot about (even thought AI wrote most of the code, I drew some diagrams to understand):

- Async queue
- Extracting files and zipping them
- Spinning up docker containers per user and using a reverse proxy(Traefik) to map to wildcard subdomains *.preview.yourapp.com
- Storing all builds files locally in a docker container and consequences
- Maybe a bit about SSE and notifications (can't connect the stream through a proxy problem)


And this website builder won't ever be reproduced if I were to do another serious try. The concept of uploading code poses a huge risk that many companies, already deducate that it wasn't worth it. We will just use jsons, semantic search, or embedding matching to build the web application if we were to go this route. This is also kind of wasted effort since its already been done and market share isn't there anymore. 