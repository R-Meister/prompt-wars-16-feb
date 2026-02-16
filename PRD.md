Atlas: Echoes of Earth
----------------------

1\. Product Summary
-------------------

**Atlas: Echoes of Earth** is a multiplayer AI-driven geography experience that transforms the traditional Atlas word game into an evolving emotional world map.

Instead of memorizing locations, players encounter short human moments connected to real cities.Every interaction leaves an emotional imprint, allowing cities to gradually develop collective personalities shaped by players.

The goal is to turn geography learning from factual recall into empathetic understanding.

2\. Problem Statement
---------------------

Current geography education focuses on:

*   memorization of names
    
*   coordinates
    
*   capital cities
    
*   trivia
    

This creates knowledge without connection.

People know _where_ places are but not _how life feels there_.

There is no interactive system that:

1.  connects real world locations to lived experiences
    
2.  evolves over time based on collective human interaction
    
3.  encourages empathy instead of correctness scoring
    

3\. Vision
----------

Create the world’s first **living emotional map** — a geography layer shaped not by data, but by human impressions.

Over time:

*   Cities develop emotional identities
    
*   Players form perceptions of cultures
    
*   The map becomes a shared memory space
    

4\. Target Users
----------------

### Primary

Students (13–25)

*   Play Atlas casually
    
*   Curious about world cultures
    
*   Comfortable with interactive narratives
    

### Secondary

Casual gamers

*   Enjoy cozy or reflective games
    
*   Like short session experiences
    

### Tertiary

Educators

*   Use as engagement tool for geography/social studies
    

5\. Core Experience
-------------------

### Traditional Rule (Retained)

Each next city must begin with the last letter of the previous city.

### New Interaction Layer

Entering a city opens a short playable moment grounded in human life.

Example:**Input:** Kyoto**Generated moment:** A baker preparing bread before sunrise

Player makes 1–2 choices that influence tone.

6\. Gameplay Loop
-----------------

1.  Player enters valid city name
    
2.  System validates Atlas rule
    
3.  AI generates culturally plausible scenario
    
4.  Player interacts (2 decisions max)
    
5.  System extracts emotional signal
    
6.  Signal stored in city memory
    
7.  Future players experience modified tone
    

7\. Emotional Memory System
---------------------------

The system does **not store stories**.

Instead it stores weighted emotional vectors:

EmotionMeaningwarmthwelcoming, comfortlonelinessisolationtensionstress, urgencynostalgiamemory, pastbelongingconnection

Each visit updates city profile:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   CityProfile = running emotional distribution   `

Future narratives are conditioned by this profile.

8\. Key Features
----------------

### 8.1 Living Cities

Cities change personality over time.

Example evolution:

*   Early: neutral Tokyo
    
*   Later: fast, pressured Tokyo
    
*   Much later: lonely Tokyo
    

### 8.2 Short Sessions

Each interaction: 20–40 seconds

### 8.3 Shared World

All players contribute to the same global memory map.

### 8.4 Non-Competitive

No pointsNo winnersProgress = understanding

9\. AI Requirements (Gemini)
----------------------------

Gemini acts as a reasoning and grounding engine.

### Must Do

*   Generate culturally plausible situations
    
*   Avoid stereotypes
    
*   Respect geography & time context
    
*   Convert choices → emotion signals
    
*   Adapt tone using stored memory
    

### Must Not Do

*   Produce long narratives
    
*   Introduce fantasy elements
    
*   Use generic filler dialogue
    

Output format (structured JSON):

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   scenario  choices  emotion_mapping  tone_parameters   `

10\. Functional Requirements
----------------------------

### 10.1 City Validation

*   Accept real cities only
    
*   Enforce Atlas last-letter rule
    
*   Prevent repetition within session
    

### 10.2 Scenario Generation

Triggered on valid city entry

### 10.3 Player Interaction

*   Max 2 decisions
    
*   No text input required
    

### 10.4 Memory Update

Store emotional vector to Firestore

### 10.5 Adaptive Rendering

Next players see tone shift

11\. Non-Functional Requirements
--------------------------------

RequirementTargetScenario generation time< 2.5 secondsSession length< 1 minuteMobile compatibilityRequiredOffensive contentZero toleranceCultural realismHigh priority

12\. Technical Architecture
---------------------------

### Frontend

Firebase Hosting + Google Maps JS API

### Backend

Cloud Functions:

*   rule validation
    
*   emotion aggregation
    
*   caching
    

### Database

Firestore

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   cities/    tokyo/      emotion_vector      visit_count      last_updated   `

### AI

Gemini API

*   scenario generation
    
*   emotion extraction
    

13\. Success Metrics
--------------------

### Engagement

*   Avg session ≥ 4 cities
    
*   Return rate ≥ 30%
    

### Emotional Impact

*   Players voluntarily revisit same city
    
*   Diverse city coverage growth
    

### Educational

*   Increased recall of cities after play
    
*   Teacher adoption feedback
    

14\. MVP Scope
--------------

Include:

*   Atlas rule validation
    
*   5000+ cities dataset
    
*   Scenario generation
    
*   Emotional memory system
    
*   Shared map visualization
    

Exclude:

*   Multiplayer real-time rooms
    
*   Voice narration
    
*   Accounts/social features
    

15\. Future Expansion
---------------------

Phase 2:

*   City timelines (past vs present)
    
*   Cultural festivals layer
    

Phase 3:

*   School classroom mode
    
*   Private worlds
    

Phase 4:

*   Audio atmospheres
    
*   Community authored memories (moderated)
    

16\. Risks
----------

RiskMitigationCultural inaccuracygrounding prompts + constraintsAI verbositystrict token limitsRepetitive outputsmemory conditioningTroll inputscity validation

17\. Definition of Done
-----------------------

The product is complete when:

A player can enter a city → experience a human moment → make a choice → influence the shared emotional map → and another player experiences a subtly changed version.