// Esteira dev do ids no K3s (http://ids.lab/). Não substitui nenhum job da Hostinger.
def REGISTRY = 'registry.platform.svc.cluster.local:5000'
def IMAGE = "${REGISTRY}/ids"
def REPO_URL = 'git@github.com:Borges360/ids.git'

def BUILD_POD = '''
apiVersion: v1
kind: Pod
spec:
  securityContext:
    fsGroup: 1000
  containers:
    - name: node
      image: node:24-bookworm-slim
      command: [sleep]
      args: [infinity]
      resources:
        requests: { cpu: 200m, memory: 512Mi }
        limits: { memory: 2048Mi }
    - name: jnlp
      resources:
        requests: { cpu: 100m, memory: 256Mi }
        limits: { memory: 512Mi }
    - name: buildkit
      image: moby/buildkit:v0.23.2-rootless
      command: [sleep]
      args: [infinity]
      env:
        - { name: BUILDKITD_FLAGS, value: --oci-worker-no-process-sandbox }
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile: { type: Unconfined }
        appArmorProfile: { type: Unconfined }
      resources:
        requests: { cpu: 500m, memory: 1536Mi }
        limits: { memory: 2560Mi }
      volumeMounts:
        - { name: dockerfile, mountPath: /config }
        - { name: buildkit-state, mountPath: /home/user/.local/share/buildkit }
  volumes:
    - name: dockerfile
      configMap: { name: ids-dockerfile }
    - name: buildkit-state
      emptyDir: {}
'''

def DEPLOY_POD = '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: lab-deployer
  containers:
    - name: kubectl
      image: alpine/k8s:1.33.4
      command: [sleep]
      args: [infinity]
      resources:
        requests: { cpu: 50m, memory: 64Mi }
        limits: { memory: 256Mi }
'''

pipeline {
  agent none
  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 60, unit: 'MINUTES')
  }
  parameters {
    string(name: 'BRANCH', defaultValue: 'develop', description: 'Branch validada do IDS; use codex/inteiro-expansion para a entrega 1.2')
    booleanParam(name: 'SKIP_TEST', defaultValue: false, description: 'Pula os testes unitários')
    booleanParam(name: 'DRY_RUN', defaultValue: false, description: 'Só build e testes: não publica imagem nem faz deploy')
  }
  stages {
    stage('Checkout, testes e imagem') {
      steps {
        script {
          podTemplate(yaml: BUILD_POD) {
            node(POD_LABEL) {
              checkout([$class: 'GitSCM',
                branches: [[name: "*/${params.BRANCH}"]],
                userRemoteConfigs: [[url: REPO_URL, credentialsId: 'github-ssh']],
                extensions: [[$class: 'CloneOption', shallow: true, depth: 1, noTags: true]]])
              def sha = sh(returnStdout: true, script: 'git rev-parse --short=7 HEAD').trim()
              env.IMAGE_TAG = "${env.BUILD_NUMBER}-${sha}"
              currentBuild.description = "${params.BRANCH} ${env.IMAGE_TAG}"
              if (!params.SKIP_TEST) {
                container('node') {
                  sh '''
                    set -eu
                    npm ci --no-audit --no-fund
                    TOKEN_BASE_REF="${GIT_PREVIOUS_SUCCESSFUL_COMMIT:-HEAD^}" npm run ci
                    npx playwright install --with-deps chromium
                    npm run test:browser
                  '''
                }
              }
              container('node') {
                sh 'rm -rf node_modules'
              }
              container('buildkit') {
                withEnv(["IMAGE=${IMAGE}", "PUSH=${params.DRY_RUN ? 'false' : 'true'}"]) {
                  sh '''
                    set -eu
                    mkdir -p /tmp/df
                    cp deploy/Dockerfile /tmp/df/Dockerfile
                    cp .dockerignore /tmp/df/Dockerfile.dockerignore
                    buildctl-daemonless.sh build \
                      --frontend dockerfile.v0 \
                      --local context=. \
                      --local dockerfile=/tmp/df \
                      --opt filename=Dockerfile \
                      --output "type=image,name=$IMAGE:$IMAGE_TAG,push=$PUSH,registry.insecure=true"
                  '''
                }
              }
            }
          }
        }
      }
    }
    stage('Deploy no namespace dev') {
      when { expression { return !params.DRY_RUN } }
      steps {
        script {
          podTemplate(yaml: DEPLOY_POD) {
            node(POD_LABEL) {
              container('kubectl') {
                withEnv(["IMAGE=${IMAGE}"]) {
                  sh '''
                    set -eu
                    kubectl -n dev set image deployment/ids app="$IMAGE:$IMAGE_TAG"
                    kubectl -n dev scale deployment/ids --replicas=1
                    kubectl -n dev rollout status deployment/ids --timeout=300s
                    code="$(curl -sS -o /dev/null -w '%{http_code}' -H 'Host: ids.lab' http://ids.dev.svc.cluster.local:4173/health)"
                    [ "$code" = "200" ]
                  '''
                }
              }
            }
          }
        }
      }
    }
  }
  post {
    success { echo "ids ${env.IMAGE_TAG ?: ''} em http://ids.lab/" }
  }
}
