images = [
    foundry : 'ghcr.io/pipeline-devsecops-para-blockchain-2025/poc-sast-dast-sca/foundry:1.5.1',
    slither : 'ghcr.io/pipeline-devsecops-para-blockchain-2025/poc-sast-dast-sca/slither:0.11.5',
    mythril : 'ghcr.io/pipeline-devsecops-para-blockchain-2025/poc-sast-dast-sca/mythril:0.24.8',
]

contractsDir = 'contracts'
reportsDir = 'reports'
solidityVersion = '0.8.30'

findingSeverities = ['High', 'Medium', 'Low', 'Informational', 'Optimization']
maxAnnotations = 50

def reportCheck(Closure body) {
    withChecks(name: 'Jenkins CI', includeStage: true) {
        try {
            body()
            publishChecks(conclusion: 'SUCCESS')
        } catch (err) {
            publishChecks(conclusion: 'FAILURE', summary: "${err}")
            throw err
        }
    }
}

def extractSettingsJson(String json) {
    def config = new groovy.json.JsonSlurper().parseText(json)
    return groovy.json.JsonOutput.toJson([remappings: config.remappings])
}

def mapSeverity(String severity) {
    switch (severity?.toLowerCase()) {
        case 'high':
            return 'FAILURE'
        case 'medium':
            return 'WARNING'
        default:
            return 'NOTICE'
    }
}

def pushMetrics(String url, String body) {
    try {
        def client = java.net.http.HttpClient.newHttpClient()
        def request = java.net.http.HttpRequest.newBuilder()
            .uri(java.net.URI.create(url))
            .header('Content-Type', 'text/plain')
            .POST(java.net.http.HttpRequest.BodyPublishers.ofString(body))
            .build()
        def response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() >= 400) {
            println "WARN: VictoriaMetrics returned HTTP ${response.statusCode()}: ${response.body()}"
        }
    } catch (Exception e) {
        println "WARN: Failed to push metrics to VictoriaMetrics: ${e.message}"
    }
}

def newSeverityCounts() {
    def counts = [:]
    findingSeverities.each { severity -> counts[severity] = 0 }
    counts
}

def initContractStats() {
    [total: 0, severityCounts: newSeverityCounts()]
}

def escapePromLabel(String value) {
    def v = value == null ? '' : value.toString()
    v = v.replace('\\', '\\\\')
    v = v.replace('"', '\\"')
    v = v.replace('\n', '\\n')
    v
}

def formatPromLabels(Map labels) {
    def parts = []
    labels.each { k, v ->
        parts << "${k}=\"${escapePromLabel(v)}\""
    }
    parts.join(',')
}

@NonCPS
def normalizeContractPath(String path) {
    if (!path) {
        return ''
    }

    def normalized = path.replace('\\', '/')
    if (normalized.startsWith('./')) {
        normalized = normalized.substring(2)
    }
    if (normalized.startsWith("${contractsDir}/")) {
        return normalized
    }
    return "${contractsDir}/${normalized}"
}

def buildSecurityMetricLines(List findings, List contracts, String tool, Map commonLabels) {
    def byContract = [:]

    contracts.each { contract ->
        byContract[contract] = initContractStats()
    }

    findings.each { f ->
        def contract = f.file.replaceFirst(/^contracts\//, '')
        if (!byContract.containsKey(contract)) {
            byContract[contract] = initContractStats()
        }

        byContract[contract].total += 1
        def sev = f.severity ?: 'Low'
        if (!byContract[contract].severityCounts.containsKey(sev)) {
            byContract[contract].severityCounts[sev] = 0
        }
        byContract[contract].severityCounts[sev] += 1
    }

    def lines = []
    byContract.each { contract, stats ->
        def base = commonLabels + [tool: tool, contract: contract]
        lines << "ci_security_contract_scanned{${formatPromLabels(base)}} 1"
        lines << "ci_security_contract_findings_total{${formatPromLabels(base)}} ${stats.total}"

        findingSeverities.each { sev ->
            def labels = base + [severity: sev]
            lines << "ci_security_findings{${formatPromLabels(labels)}} ${stats.severityCounts[sev] ?: 0}"
        }
    }

    lines
}

def findingKey(Map finding) {
    [
        finding.tool,
        finding.file,
        finding.detector,
        finding.severity,
        finding.startLine,
        finding.endLine,
        finding.message,
    ].collect { it == null ? '' : it.toString() }.join('|')
}

def countNewFindings(List currentFindings, List previousFindings) {
    def previousKeys = previousFindings.collect { findingKey(it) } as Set
    currentFindings.count { !previousKeys.contains(findingKey(it)) }
}

def branchMainJobName() {
    if (!env.JOB_NAME?.contains('/')) {
        return 'main'
    }
    env.JOB_NAME.replaceFirst(/\/[^\/]+$/, '/main')
}

def loadPreviousFindings() {
    def findings = [slither: [], mythril: []]
    def previousBuild = currentBuild.previousSuccessfulBuild
    def sourceJobName = env.JOB_NAME
    def sourceSelector = null
    def sourceDescription = null

    if (previousBuild) {
        sourceSelector = specific("${previousBuild.number}")
        sourceDescription = "build ${previousBuild.number} of ${sourceJobName}"
    } else if (env.BRANCH_NAME && env.BRANCH_NAME != 'main') {
        sourceJobName = branchMainJobName()
        sourceSelector = lastSuccessful()
        sourceDescription = "last successful build of ${sourceJobName}"
    }

    if (!sourceSelector) {
        return findings
    }

    try {
        copyArtifacts(
            projectName: sourceJobName,
            selector: sourceSelector,
            filter: "${reportsDir}/slither.json,${reportsDir}/mythril/*.json,${reportsDir}/mythril/manifest.json",
            target: 'previous-reports',
            optional: true,
        )
    } catch (Exception e) {
        echo "WARN: Failed to load previous findings from ${sourceDescription}: ${e.message}"
        return findings
    }

    if (fileExists("previous-reports/${reportsDir}/slither.json")) {
        findings.slither = parseSlitherReport(readFile("previous-reports/${reportsDir}/slither.json"))
    }

    def mythrilManifest = [:]
    if (fileExists("previous-reports/${reportsDir}/mythril/manifest.json")) {
        mythrilManifest = new groovy.json.JsonSlurper().parseText(
            readFile("previous-reports/${reportsDir}/mythril/manifest.json")
        ) as Map
    }

    def mythrilEntries = []
    findFiles(glob: "previous-reports/${reportsDir}/mythril/*.json")
        .findAll { it.name != 'manifest.json' }
        .each { f ->
            def text = readFile(f.path).trim()
            if (text) {
                mythrilEntries << [name: f.name, content: text]
            }
        }

    findings.mythril = parseMythrilReports(mythrilEntries, mythrilManifest)
    findings
}

def sendNotification(String subject, String body) {
    try {
        emailext(
            to: '$DEFAULT_RECIPIENTS',
            subject: subject,
            body: body,
            mimeType: 'text/plain',
        )
    } catch (Exception e) {
        echo "WARN: Failed to send email notification: ${e.message}"
    }
}

@NonCPS
def parseSlitherReport(String json) {
    def data = new groovy.json.JsonSlurper().parseText(json)
    def findings = []

    data?.results?.detectors?.each { det ->
        def el = det.elements?.find {
            def rel = it.source_mapping?.filename_relative
            rel?.startsWith('src/') || rel?.startsWith('contracts/src/')
        }
        if (!el) {
            return
        }

        def lines = el.source_mapping?.lines ?: [1]
        def startLine = 1
        def endLine = 1
        if (lines) {
            startLine = lines[0] as int
            endLine = lines[0] as int
            lines.each { line ->
                int n = line as int
                if (n < startLine) startLine = n
                if (n > endLine) endLine = n
            }
        }

        findings << [
            tool      : 'slither',
            detector  : det.check ?: 'unknown',
            severity  : det.impact ?: 'Informational',
            confidence: det.confidence ?: 'Low',
            file      : normalizeContractPath(el.source_mapping.filename_relative),
            startLine : startLine,
            endLine   : endLine,
            message   : det.description?.replaceAll(/\n/, ' ')?.take(512) ?: '',
        ]
    }

    findings
}

@NonCPS
def parseMythrilReports(List reportEntries, Map manifest = [:]) {
    def findings = []

    reportEntries.each { entry ->
        def srcPath = manifest[entry.name] ?: entry.name.replaceFirst(/\.json$/, '')
        def normalizedPath = normalizeContractPath(srcPath)

        def data = new groovy.json.JsonSlurper().parseText(entry.content)
        def issues = data instanceof List ? data[0]?.issues : data?.issues
        issues?.each { issue ->
            findings << [
                tool      : 'mythril',
                detector  : issue.swcID ?: 'unknown',
                severity  : issue.severity ?: 'Low',
                confidence: 'N/A',
                file      : normalizedPath,
                startLine : 1,
                endLine   : 1,
                message   : issue.description?.head?.take(512) ?: '',
            ]
        }
    }

    findings
}

@NonCPS
def parseJsonMap(String json) {
    new groovy.json.JsonSlurper().parseText(json) as Map
}

@NonCPS
def buildSummary(List slitherFindings, List mythrilFindings) {
    def aggregate = { List findings ->
        def bySeverity = findings.groupBy { it.severity }
            .collectEntries { sev, list -> [(sev): list.size()] }
        def byContract = findings.groupBy { it.file }
            .collectEntries { file, list ->
                [(file.replaceFirst(/^contracts\//, '')): list.size()]
            }
            .sort { -it.value }
        [
            total     : findings.size(),
            bySeverity: bySeverity,
            byContract: byContract,
        ]
    }

    def severityTable = { Map stats, String toolName ->
        def lines = ["### ${toolName} - ${stats.total} findings\n"]
        lines << "| Severity | Count |"
        lines << "| :------- | ----: |"
        findingSeverities.each { sev ->
            def count = stats.bySeverity[sev]
            if (count) {
                lines << "| ${sev} | ${count} |"
            }
        }
        lines << ""
        lines << "| Contract | Findings |"
        lines << "| :------- | -------: |"
        stats.byContract.each { contract, count ->
            lines << "| `${contract}` | ${count} |"
        }
        lines.join('\n')
    }

    def slither = aggregate(slitherFindings)
    def mythril = aggregate(mythrilFindings)

    [
        slither        : slither,
        mythril        : mythril,
        slitherMarkdown: severityTable(slither, 'Slither'),
        mythrilMarkdown: severityTable(mythril, 'Mythril'),
        markdown       : severityTable(slither, 'Slither') + '\n\n' + severityTable(mythril, 'Mythril'),
    ]
}

def prioritizeFindings(List findings, int limit = 50) {
    def high = []
    def medium = []
    def other = []

    findings.each { f ->
        switch (f.severity?.toLowerCase()) {
            case 'high':
                high << f
                break
            case 'medium':
                medium << f
                break
            default:
                other << f
                break
        }
    }

    def ordered = []
    [high, medium, other].each { bucket ->
        bucket.each { f ->
            if (ordered.size() < limit) {
                ordered << f
            }
        }
    }

    ordered
}

pipeline {
    agent {
        label 'docker-agent'
    }

    options {
        skipDefaultCheckout()
        timestamps()
    }

    stages {
        stage('Checkout with Submodules') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: scm.branches,
                    userRemoteConfigs: scm.userRemoteConfigs,
                    extensions: [
                        [$class: 'SubmoduleOption', recursiveSubmodules: true, parentCredentials: true]
                    ]
                ])
            }
        }

        stage('Build Contracts') {
            agent {
                docker {
                    image images.foundry
                    reuseNode true
                }
            }
            steps {
                dir(contractsDir) {
                    sh 'forge build --build-info'
                    sh 'forge config --json > .forge-config.json'
                }
            }
        }

        stage('Analysis') {
            parallel {
                stage('Forge Format') {
                    agent {
                        docker {
                            image images.foundry
                            reuseNode true
                        }
                    }
                    steps {
                        reportCheck {
                            dir(contractsDir) {
                                sh 'forge fmt --check'
                            }
                        }
                    }
                }

                stage('Forge Lint') {
                    agent {
                        docker {
                            image images.foundry
                            reuseNode true
                        }
                    }
                    steps {
                        reportCheck {
                            dir(contractsDir) {
                                sh 'forge lint'
                            }
                        }
                    }
                }

                stage('Forge Tests') {
                    agent {
                        docker {
                            image images.foundry
                            reuseNode true
                        }
                    }
                    steps {
                        reportCheck {
                            dir(contractsDir) {
                                sh 'forge test -vvv'
                            }
                        }
                    }
                }

                stage('Slither') {
                    agent {
                        docker {
                            image images.slither
                            args '--entrypoint='
                            reuseNode true
                        }
                    }
                    steps {
                        reportCheck {
                            sh "mkdir -p ${reportsDir}"
                            dir(contractsDir) {
                                sh """
                                    slither . \
                                        --ignore-compile --exclude-dependencies \
                                        --no-fail-pedantic --json ../${reportsDir}/slither.json
                                """
                            }
                            stash name: 'slither-report', includes: "${reportsDir}/slither.json", allowEmpty: true
                        }
                    }
                }

                stage('Mythril') {
                    agent {
                        docker {
                            image images.mythril
                            args '--entrypoint='
                            reuseNode true
                        }
                    }
                    steps {
                        script {
                            def config = readFile(file: "${contractsDir}/.forge-config.json")
                            writeFile(file: "${contractsDir}/.solc-config.json", text: extractSettingsJson(config))
                        }

                        sh "mkdir -p ${reportsDir}/mythril"

                        script {
                            def files = findFiles(glob: "${contractsDir}/src/**/*.sol").collect { it.path }
                            def manifest = [:]
                            def branches = [:]

                            files.each { filePath ->
                                def shortName = filePath.replaceAll(/[\\\\\\/]/, '__')
                                def safeName = shortName.replaceAll(/[^A-Za-z0-9_.-]/, '_') + '.json'
                                manifest[safeName] = filePath

                                branches[filePath] = {
                                    reportCheck {
                                        script {
                                            def exitCode = sh(
                                                script: """
                                                    bash -o pipefail -c "
                                                        myth analyze '${filePath}' \
                                                            --solv ${solidityVersion} \
                                                            --solc-json ${contractsDir}/.solc-config.json \
                                                            --outform jsonv2 | tee ${reportsDir}/mythril/${safeName}
                                                    "
                                                """,
                                                returnStatus: true
                                            )
                                            println "Mythril report for ${filePath}: ${exitCode}"
                                        }
                                    }
                                }
                            }

                            writeJSON(file: "${reportsDir}/mythril/manifest.json", json: manifest, pretty: 2)

                            if (!branches.isEmpty()) {
                                parallel branches
                            }
                        }

                        stash name: 'mythril-report', includes: "${reportsDir}/mythril/*.json", allowEmpty: true
                    }
                }
            }
        }
    }

    post {
        always {
            catchError { unstash 'slither-report' }
            catchError { unstash 'mythril-report' }

            script {
                def slitherFindings = []
                if (fileExists("${reportsDir}/slither.json")) {
                    slitherFindings = parseSlitherReport(readFile("${reportsDir}/slither.json"))
                }

                def mythrilManifest = [:]
                if (fileExists("${reportsDir}/mythril/manifest.json")) {
                    mythrilManifest = parseJsonMap(readFile("${reportsDir}/mythril/manifest.json"))
                }

                def mythrilEntries = []
                findFiles(glob: "${reportsDir}/mythril/*.json")
                    .findAll { it.name != 'manifest.json' }
                    .each { f ->
                        def text = readFile(f.path).trim()
                        if (text) {
                            mythrilEntries << [name: f.name, content: text]
                        } else {
                            echo "Skipping empty mythril report: ${f.path}"
                        }
                    }

                def mythrilFindings = parseMythrilReports(mythrilEntries, mythrilManifest)
                def summary = buildSummary(slitherFindings, mythrilFindings)

                echo "=== SAST Results ===\n${summary.markdown}"

                if (slitherFindings) {
                    publishChecks(
                        name       : 'Slither SAST',
                        title      : "Slither: ${summary.slither.total} findings",
                        summary    : summary.slitherMarkdown,
                        conclusion : 'NEUTRAL',
                        annotations: prioritizeFindings(slitherFindings, maxAnnotations).collect { f ->
                            [
                                path           : f.file,
                                startLine      : f.startLine,
                                endLine        : f.endLine,
                                annotationLevel: mapSeverity(f.severity),
                                title          : f.detector,
                                message        : f.message,
                                rawDetails     : "Confidence: ${f.confidence}",
                            ]
                        }
                    )
                }

                if (mythrilFindings) {
                    publishChecks(
                        name       : 'Mythril SAST',
                        title      : "Mythril: ${summary.mythril.total} findings",
                        summary    : summary.mythrilMarkdown,
                        conclusion : 'NEUTRAL',
                        annotations: prioritizeFindings(mythrilFindings, maxAnnotations).collect { f ->
                            [
                                path           : f.file,
                                startLine      : f.startLine,
                                endLine        : f.endLine,
                                annotationLevel: mapSeverity(f.severity),
                                title          : f.detector,
                                message        : f.message,
                            ]
                        }
                    )
                }

                def contracts = findFiles(glob: "${contractsDir}/src/**/*.sol")
                    .collect { it.path.replaceFirst(/^contracts\//, '') }

                def commonLabels = [
                    branch      : env.BRANCH_NAME,
                    job         : env.JOB_NAME,
                    build_number: env.BUILD_NUMBER,
                ]

                def metricLines = []
                if (slitherFindings) {
                    metricLines += buildSecurityMetricLines(slitherFindings, contracts, 'slither', commonLabels)
                }
                if (mythrilFindings) {
                    metricLines += buildSecurityMetricLines(mythrilFindings, contracts, 'mythril', commonLabels)
                }
                if (metricLines) {
                    pushMetrics('http://victoriametrics:8428/api/v1/import/prometheus', metricLines.join('\n'))
                }

                def previousFindings = loadPreviousFindings()
                def newSlitherFindings = countNewFindings(slitherFindings, previousFindings.slither)
                def newMythrilFindings = countNewFindings(mythrilFindings, previousFindings.mythril)
                def hasNewFindings = newSlitherFindings > 0 || newMythrilFindings > 0
                def buildResult = currentBuild.currentResult ?: 'SUCCESS'

                if (buildResult != 'SUCCESS' || hasNewFindings) {
                    def buildUrl = env.BUILD_URL ?: ''
                    def lines = [
                        "Build: ${currentBuild.fullDisplayName}",
                        "Result: ${buildResult}",
                        "Slither findings: ${summary.slither.total} (new: ${newSlitherFindings})",
                        "Mythril findings: ${summary.mythril.total} (new: ${newMythrilFindings})",
                    ]

                    if (buildUrl) {
                        lines += [
                            '',
                            "Build URL: ${env.RUN_DISPLAY_URL ?: buildUrl}",
                            "Console log: ${buildUrl}console",
                            "Artifacts: ${buildUrl}artifact/${reportsDir}/",
                        ]
                    }

                    sendNotification(
                        "${buildResult}: ${currentBuild.fullDisplayName}",
                        lines.join('\n'),
                    )
                }
            }

            archiveArtifacts artifacts: "${reportsDir}/**", allowEmptyArchive: true
            cleanWs()
        }
    }
}
