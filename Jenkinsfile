pipeline {
    agent any

    stages {

        stage('Clone') {
            steps {
                git 'repo-url'
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
                  -p 3000:3000 \
                  build-watch
                '''
            }
        }
    }
}