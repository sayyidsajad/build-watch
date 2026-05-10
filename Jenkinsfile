pipeline {
    agent any

    stages {

        stage('Clone') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/sayyidsajad/build-watch.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t build-watch .'
            }
        }

        stage('Stop Old Container') {
            steps {
                sh '''
                docker stop build-watch || true
                docker rm build-watch || true
                '''
            }
        }

        stage('Run Container') {
            steps {
                sh '''
                docker run -d \
                  --name build-watch \
                  -p 3000:8081 \
                  build-watch
                '''
            }
        }
    }
}