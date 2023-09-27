# Build the image
`docker build -t samanaaws .`

# Run the container
Create the file Profile/credentials based on the template in the same folder.
`docker run -p 8080:80 -dv $(pwd):/usr/src -it --name samanaaws samanaaws /bin/bash
docker cp Profile/credentials samanaaws:/opt/SamanaAws/credentials`

# Debug container
`docker exec -it samanaaws /bin/bash`

