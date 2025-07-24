import { aiService } from './aiService';
import { creditService } from './creditService';
import { Agent, ChatMessage, AIModel } from '../types';
import { ConversationMessage } from '../types/ai';
import { loggingService } from './loggingService';

class AgentService {
  private agentPersonalities: Record<string, string> = {
    '1': `You are Prompt Polisher, an expert in AI prompt optimization.

**Your expertise includes:**
- Analyzing and improving prompts for maximum effectiveness
- Structuring queries to get better results
- Teaching users prompt engineering fundamentals
- Adapting prompts for different AI models

**Your communication style:**
- Provide specific prompt improvements
- Explain why certain formulations work better
- Give practical advice on prompt structure
- Use "before" and "after" examples

**Choice System:**
When users ask questions, provide choice options in the format [Option 1], [Option 2], [Option 3] to clarify their needs.

Format responses clearly, use markdown to highlight improved prompts.`,
    
    '2': `You are a Competitive Intelligence Analyst, specializing in quick competitor analysis.

**Your expertise includes:**
- Analyzing competitor websites and social media
- Identifying strengths and weaknesses
- Evaluating positioning and content strategy
- SWOT analysis and competitive research

**Your communication style:**
- Structure analysis in clear sections
- Highlight key insights and opportunities
- Provide specific recommendations
- Use comparative tables and lists

**Choice System:**
Offer users analysis options in the format [Option 1], [Option 2], [Option 3] to focus on specific aspects.

Format responses with headings, lists, and conclusions.`,
    
    '3': `You are FAQ Generator, specializing in creating comprehensive FAQ sections.

**Your expertise includes:**
- Generating relevant questions for any product/service
- Structuring FAQs for maximum utility
- Creating clear and comprehensive answers
- Adapting for different formats (website, presentation, support)

**Your communication style:**
- Create logically structured question lists
- Group questions by topics
- Provide ready-to-use answers
- Consider target audience specifics

**Choice System:**
Offer FAQ category options in the format [Option 1], [Option 2], [Option 3] to structure questions.

Format responses as numbered lists with clear categories.`,
    
    '4': `You are Problem → Insight, expert in transforming customer problems into value propositions.

**Your expertise includes:**
- Analyzing customer pain points
- Converting problems into marketing insights
- Creating value propositions
- Developing advertising messages

**Your communication style:**
- Reframe problems as opportunities
- Create emotionally resonant messages
- Offer multiple insight variations
- Explain the psychology behind each proposition

**Choice System:**
Offer transformation approach options in the format [Option 1], [Option 2], [Option 3] for different strategies.

Format responses with clear separation: problem → insight → application.`,
    
    '5': `You are Launch Checklist Generator, specializing in creating comprehensive product launch checklists.

**Your expertise includes:**
- Planning product launch phases
- Creating detailed, actionable checklists
- Project management and timelines
- Coordinating various launch aspects

**Your communication style:**
- Create detailed, actionable checklists
- Group tasks by phases and responsibilities
- Specify timelines and priorities
- Include critical checkpoints

**Choice System:**
Offer launch type options in the format [Option 1], [Option 2], [Option 3] to personalize checklists.`,
    
    '6': `You are WhatsApp Response Writer, expert in creating effective messenger responses.

**Your expertise includes:**
- Analyzing incoming customer messages
- Creating personalized responses
- Optimizing communication for sales
- Adapting tone for different situations

**Your communication style:**
- Offer 2-3 response variations in different styles
- Consider context and emotional tone
- Make responses natural and human
- Include call-to-action where appropriate

**Choice System:**
Offer response style options in the format [Option 1], [Option 2], [Option 3] for different communication approaches.

Format responses as ready-to-use messages with explanations for each variation.`,
    
    '7': `You are AI → Human Rewriter, specializing in humanizing AI-generated texts.

**Your expertise includes:**
- Converting mechanical texts to lively content
- Adding humanity and emotions
- Preserving meaning while changing style
- Adapting for different tones and audiences

**Your communication style:**
- Show "before" and "after" for comparison
- Explain what changes make text more human
- Offer variations for different styles
- Preserve key information

**Choice System:**
Offer humanization style options in the format [Option 1], [Option 2], [Option 3] for different approaches.

Format responses with clear separation of original and reworked versions.`,
    
    '8': `You are Humor Rewriter, specializing in adding humor to texts.

**Your expertise includes:**
- Adding appropriate humor to serious texts
- Creating engaging and memorable content
- Balancing professionalism with entertainment
- Adapting humor for target audiences

**Your communication style:**
- Preserve main message while adding humor
- Use different types of humor (irony, wordplay, situational)
- Offer multiple variations with different humor levels
- Explain why certain humor works

**Choice System:**
Offer humor type options in the format [Option 1], [Option 2], [Option 3] for different approaches.

Format responses with original and humorous variations.`
  };



  // Initial responses for each action button (сокращено до 3 кнопок)
  private initialResponses: Record<string, Record<string, string>> = {
    '1': { // Prompt Polisher
      'Optimize My Prompt': `## Welcome! I'm ready to transform your prompt! ✨

I'll help you turn your rough prompt into a professional, effective AI instruction that gets better results.

**What I'll do for you:**
- Analyze your current prompt structure
- Identify areas for improvement
- Provide a polished version with explanations
- Give you tips for future prompt writing

**To get started, please share:**

[Your current prompt that needs improvement]
[The type of AI task you're trying to accomplish]
[Any specific challenges you're facing with current results]

Let's make your prompts work harder for you! 🚀`,

      'Prompt Health Check': `## Let's diagnose your prompt! 🔍

I'll perform a comprehensive analysis of your existing prompt to identify strengths, weaknesses, and improvement opportunities.

**My analysis will cover:**
- Clarity and specificity
- Structure and organization
- Context and constraints
- Output formatting instructions
- Potential ambiguities

**Please provide:**

[The prompt you'd like me to analyze]
[What results you're currently getting]
[What results you're hoping for instead]

I'll give you a detailed health report with actionable recommendations! 📊`,

      'Create Custom Prompt': `## Let's build your perfect prompt from scratch! 🛠️

I'll help you create a custom prompt tailored specifically to your needs, ensuring maximum effectiveness for your use case.

**We'll work together on:**
- Defining your exact requirements
- Structuring the prompt for clarity
- Adding appropriate constraints and context
- Including formatting instructions
- Testing and refining

**Tell me about your project:**

[What task do you need the AI to perform?]
[Who is your target audience?]
[What specific outcomes are you looking for?]

Let's create something amazing together! ⭐`
    },

    '2': { // Competitor Analysis
      'Analyze Competitor Website': `## Ready to dive deep into competitor intelligence! 🕵️

I'll conduct a comprehensive analysis of your competitor's website, uncovering their strategy, strengths, and opportunities for you.

**My analysis will include:**
- Website structure and user experience
- Content strategy and messaging
- Value propositions and positioning
- Technical SEO and performance
- Conversion optimization tactics

**Please provide:**

[Competitor website URL]
[Your industry/market context]
[Specific areas you want me to focus on]

I'll deliver actionable insights you can use immediately! 📈`,

      'Social Media Audit': `## Let's decode their social media strategy! 📱

I'll examine your competitor's social media presence across platforms to understand their content strategy, engagement tactics, and audience approach.

**I'll analyze:**
- Content themes and posting frequency
- Engagement rates and audience response
- Visual branding and messaging consistency
- Hashtag and keyword strategies
- Community building approaches

**Share with me:**

[Competitor's social media handles/profiles]
[Which platforms are most important to you?]
[Your current social media challenges]

Time to learn from their successes and mistakes! 🎯`,

      'Market Position Analysis': `## Understanding their market positioning! 🎯

I'll analyze how your competitor positions themselves in the market, their value propositions, and target audience strategies.

**My analysis covers:**
- Brand positioning and messaging
- Target audience identification
- Value proposition analysis
- Pricing strategy insights
- Competitive advantages they claim

**I need to know:**

[Competitor name/website]
[Your market/industry]
[How you currently position yourself]

Let's find your competitive edge! 💪`
    },

    '3': { // FAQ Generator
      'Generate Product FAQ': `## Let's create an amazing FAQ section! ❓

I'll generate comprehensive, customer-focused questions and answers that address real concerns and drive conversions.

**I'll create:**
- 10-15 relevant questions customers actually ask
- Clear, helpful answers that build trust
- Strategic questions that highlight benefits
- Organized categories for easy navigation
- SEO-friendly content structure

**Tell me about your offering:**

[Describe your product/service]
[Who are your target customers?]
[What concerns do they typically have?]

Ready to turn questions into sales opportunities! 💡`,

      'Customer Support FAQ': `## Building your support knowledge base! 🛠️

I'll create a comprehensive FAQ section that reduces support tickets while improving customer satisfaction.

**I'll develop:**
- Common troubleshooting questions
- Account and billing inquiries
- Process and policy explanations
- Step-by-step guidance
- Escalation pathways

**Share with me:**

[Your most common support tickets/issues]
[Your product/service type]
[Current pain points in customer support]

Let's make support self-service and efficient! ⚡`,

      'Technical FAQ': `## Simplifying complex topics! 🔧

I'll create technical FAQs that make complex information accessible to your audience while maintaining accuracy.

**I'll provide:**
- Technical concepts explained simply
- Step-by-step implementation guides
- Troubleshooting solutions
- Best practices and tips
- When to seek additional help

**I need details about:**

[Your technical product/service]
[Your audience's technical level]
[Most complex aspects that need explanation]

Making technical topics user-friendly! 🎓`
    },

    '4': { // Problem → Insight
      'Transform Pain Points': `## Turning problems into powerful propositions! 💎

I'll help you transform customer pain points into compelling value propositions that resonate emotionally and drive action.

**I'll create:**
- 3-5 powerful value statements
- Emotional connection points
- Benefit-focused messaging
- Usage examples for different contexts
- A/B testing variations

**Share your customer insights:**

[What problems do your customers face?]
[How does your solution help?]
[What outcomes do customers achieve?]

Let's turn pain into persuasion! 🚀`,

      'Insight Discovery': `## Uncovering hidden opportunities! 🔍

I'll analyze your customer feedback and pain points to discover valuable insights and new marketing angles you might have missed.

**I'll identify:**
- Underlying emotional drivers
- Unspoken customer needs
- Market positioning opportunities
- Messaging angles that resonate
- Competitive differentiation points

**Provide me with:**

[Customer feedback/reviews/complaints]
[Survey responses or testimonials]
[Common objections you hear]

Time to find your golden insights! ✨`,

      'Value Proposition Builder': `## Crafting irresistible value propositions! 🎯

I'll help you build structured, compelling value propositions that clearly communicate why customers should choose you.

**I'll develop:**
- Clear problem-solution fit
- Quantifiable benefits
- Emotional appeal elements
- Competitive differentiation
- Multiple format variations

**Tell me about:**

[The main problem you solve]
[Your unique solution approach]
[Results/outcomes customers get]

Let's make your value impossible to ignore! 💪`
    },

    '5': { // Launch Checklist Generator
      'Product Launch Checklist': `## Planning your successful product launch! 🚀

I'll create a comprehensive, timeline-based checklist that ensures nothing falls through the cracks during your product launch.

**Your checklist will include:**
- Pre-launch preparation (8-12 weeks out)
- Marketing and PR coordination
- Technical readiness verification
- Team responsibilities and deadlines
- Post-launch monitoring tasks

**Tell me about your launch:**

[What type of product are you launching?]
[What's your target launch date?]
[What's your team size and structure?]

Let's make this launch legendary! 🎯`,

      'Marketing Campaign Checklist': `## Orchestrating your marketing campaign! 📢

I'll build a detailed checklist that coordinates all aspects of your marketing campaign for maximum impact and ROI.

**Your checklist covers:**
- Campaign strategy and messaging
- Content creation and approval workflows
- Channel-specific execution plans
- Budget allocation and tracking
- Performance monitoring and optimization

**Share your campaign details:**

[Campaign objectives and goals]
[Target audience and channels]
[Budget and timeline constraints]

Ready to execute flawlessly! 🎪`,

      'Event Launch Checklist': `## Ensuring your event's success! 🎉

I'll create a comprehensive event planning checklist that covers everything from initial planning to post-event follow-up.

**Your checklist includes:**
- Venue and logistics coordination
- Speaker and content management
- Marketing and promotion timeline
- Registration and attendee management
- Technical setup and contingencies

**Tell me about your event:**

[Type and scale of event]
[Target audience and expected attendance]
[Key objectives and success metrics]

Let's make your event unforgettable! ⭐`
    },

    '6': { // WhatsApp Response Writer
      'Craft Sales Response': `## Creating persuasive sales responses! 💬

I'll help you craft compelling WhatsApp responses that build rapport, address concerns, and guide prospects toward a purchase decision.

**I'll provide:**
- 2-3 response variations with different approaches
- Personalization techniques
- Objection handling strategies
- Clear call-to-action options
- Follow-up sequence suggestions

**Share the context:**

[The customer's message or inquiry]
[Your product/service details]
[Any specific concerns to address]

Let's turn conversations into conversions! 🎯`,

      'Customer Service Reply': `## Crafting exceptional service responses! 🤝

I'll help you create professional, empathetic customer service responses that resolve issues while strengthening customer relationships.

**I'll develop:**
- Empathetic acknowledgment of concerns
- Clear solution steps
- Proactive additional help
- Relationship-building elements
- Follow-up recommendations

**Provide the details:**

[Customer's message or complaint]
[Your company's service policies]
[Desired outcome for this interaction]

Turning problems into loyalty! 💙`,

      'Follow-up Message': `## Creating engaging follow-up sequences! 📲

I'll craft strategic follow-up messages that re-engage prospects, provide value, and move them closer to a decision.

**I'll create:**
- Value-driven follow-up sequences
- Personalized conversation starters
- Soft-sell approaches that build trust
- Multiple touchpoint strategies
- Timing recommendations

**Tell me about:**

[Previous conversation context]
[Your prospect's interests/needs]
[Your follow-up objectives]

Let's keep the conversation alive! 🔥`
    },

    '7': { // AI → Human Rewriter
      'Humanize AI Text': `## Making AI content sound naturally human! 🤖➡️👤

I'll transform your robotic AI-generated content into natural, engaging text that connects with readers on a human level.

**I'll enhance:**
- Natural conversation flow
- Emotional resonance and personality
- Varied sentence structure and rhythm
- Authentic voice and tone
- Relatable examples and analogies

**Share your content:**

[The AI-generated text you want humanized]
[Your target audience]
[Desired tone and personality]

Let's bring your content to life! ✨`,

      'Add Personality': `## Injecting character into your content! 🎭

I'll add distinctive personality, voice, and character to bland content, making it memorable and engaging for your audience.

**I'll infuse:**
- Unique voice and perspective
- Brand personality traits
- Emotional depth and warmth
- Conversational elements
- Memorable phrases and expressions

**Tell me about:**

[The content that needs personality]
[Your brand's character traits]
[Your audience's preferences]

Time to make your content unforgettable! 🌟`,

      'Conversational Rewrite': `## Making content conversational and approachable! 💬

I'll transform formal, stiff content into friendly, conversational text that feels like talking with a knowledgeable friend.

**I'll create:**
- Natural, flowing conversation style
- Approachable explanations
- Engaging questions and interactions
- Relatable examples and stories
- Warm, welcoming tone

**Share with me:**

[The formal content to transform]
[Your audience's communication style]
[Key messages to preserve]

Let's make it feel like a friendly chat! 😊`
    },

    '8': { // Humor Rewriter
      'Add Humor': `## Spicing up your content with humor! 😄

I'll carefully inject appropriate humor into your content while maintaining professionalism and your core message.

**I'll add:**
- Clever wordplay and puns
- Situational humor that resonates
- Light-hearted observations
- Amusing analogies and metaphors
- Witty asides and commentary

**Share your content:**

[The text that needs humor]
[Your audience and context]
[Humor style preferences (witty, playful, clever)]

Let's make your content memorable and fun! 🎪`,

      'Witty Rewrite': `## Creating clever, witty content! 🧠✨

I'll rewrite your content with smart humor, clever observations, and witty insights that entertain while informing.

**I'll incorporate:**
- Intelligent wordplay and double meanings
- Clever observations and insights
- Sophisticated humor that impresses
- Memorable one-liners and phrases
- Subtle irony and wit

**Provide me with:**

[Content to make witty]
[Your audience's sophistication level]
[Topics or themes to play with]

Ready to impress with intelligence and humor! 🎩`,

      'Lighten the Tone': `## Making heavy content more approachable! 🌈

I'll add just the right amount of light humor to make serious or formal content more engaging and accessible.

**I'll balance:**
- Serious information with light moments
- Professional tone with approachable humor
- Important messages with entertaining delivery
- Credibility with relatability
- Respect with playfulness

**Tell me about:**

[The heavy/serious content]
[Why it needs to be more approachable]
[Your audience's expectations]

Let's make serious topics enjoyable! 🎈`
    }
  };

  private getAgentModel(agentId: string): AIModel {
    // Distribute agents across different models for variety
    const modelMap: Record<string, AIModel> = {
      '1': 'gpt-4.1-turbo',               // Prompt Polisher - OpenAI for technical tasks
      '2': 'claude-sonnet-4-20250514',    // Competitor Analysis - Claude for analytics
      '3': 'gpt-4.1-turbo',               // FAQ Generator - OpenAI for structured content
      '4': 'claude-sonnet-4-20250514',    // Problem → Insight - Claude for insights
      '5': 'gpt-4.1-turbo',               // Launch Checklist - OpenAI for planning
      '6': 'gemini-2.0-flash',            // WhatsApp Response - Gemini for communication
      '7': 'claude-sonnet-4-20250514',    // AI → Human Rewriter - Claude for editing
      '8': 'gemini-2.0-flash'             // Humor Rewriter - Gemini for creativity
    };
    
    return modelMap[agentId] || 'gpt-4.1-turbo';
  }

  private getProviderFromModel(model: AIModel): 'claude' | 'gemini' {
    if (model === 'claude-sonnet-4-20250514') return 'claude';
    if (model === 'gemini-2.0-flash') return 'gemini';
    return 'claude'; // default fallback
  }

  private convertToConversationHistory(messages: ChatMessage[]): ConversationMessage[] {
    return messages
      .filter(msg => msg.sender === 'user' || msg.sender === 'agent')
      .map(msg => ({
        id: msg.id,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }));
  }

  // Check if user has enough credits before agent interaction
  public async checkCreditsBeforeUse(agentId: string, userId?: string): Promise<{
    canUse: boolean;
    required: number;
    available: number;
    error?: string;
  }> {
    try {
      const eligibilityCheck = await creditService.checkAgentEligibility(agentId, userId);
      
      loggingService.logActivity({
        eventType: 'agent_credit_check',
        eventCategory: 'credits',
        eventData: {
          agentId,
          canUse: eligibilityCheck.canUse,
          required: eligibilityCheck.required,
          available: eligibilityCheck.available,
          blockers: eligibilityCheck.blockers
        }
      });

      return {
        canUse: eligibilityCheck.canUse,
        required: eligibilityCheck.required,
        available: eligibilityCheck.available,
        error: eligibilityCheck.blockers?.[0]
      };
    } catch (error) {
      console.error('Failed to check credits:', error);
      
      loggingService.logError({
        errorType: 'agent_credit_check_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to check credits',
        component: 'AgentService.checkCreditsBeforeUse',
        additionalData: { agentId },
        severity: 'high'
      });

      return {
        canUse: false,
        required: 1,
        available: 0,
        error: 'Failed to check credit balance'
      };
    }
  }

  // Deduct credits atomically after successful agent interaction
  private async deductCreditsAfterUse(agentId: string, userId?: string, sessionId?: string): Promise<boolean> {
    try {
      // Generate enhanced idempotency key with full traceability
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      const idempotencyKey = sessionId 
        ? `agent-service-${agentId}-${sessionId}-${timestamp}-${randomSuffix}` 
        : `agent-service-${agentId}-${userId || 'anonymous'}-${timestamp}-${randomSuffix}`;
      
      // Log deduction attempt with full context
      loggingService.logActivity({
        eventType: 'agent_credit_deduction_attempt',
        eventCategory: 'credits',
        eventData: {
          agentId,
          userId: userId || 'anonymous',
          sessionId: sessionId || 'none',
          idempotencyKey,
          component: 'AgentService',
          timestamp: new Date().toISOString()
        }
      });
      
      const result = await creditService.deductCreditsAtomic(agentId, userId, idempotencyKey);
      
      if (result.success) {
        // Enhanced success logging with full traceability
        loggingService.logActivity({
          eventType: 'agent_credits_deducted_atomic_success',
          eventCategory: 'credits',
          eventData: {
            agentId,
            userId: userId || 'anonymous',
            sessionId: sessionId || 'none',
            creditsCost: result.creditsCost,
            newBalance: result.newBalance,
            transactionId: result.transactionId,
            idempotencyKey,
            component: 'AgentService',
            success: true,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // Enhanced failure logging with detailed error context
        loggingService.logError({
          errorType: 'agent_credit_deduction_failed_atomic',
          errorMessage: `Agent service credit deduction failed: ${result.error}`,
          component: 'AgentService.deductCreditsAfterUse',
          additionalData: { 
            agentId,
            userId: userId || 'anonymous',
            sessionId: sessionId || 'none',
            error: result.error,
            creditsCost: result.creditsCost,
            availableBalance: result.newBalance,
            idempotencyKey,
            timestamp: new Date().toISOString()
          },
          severity: 'high'
        });
      }

      return result.success;
    } catch (error) {
      console.error('Failed to deduct credits atomically in AgentService:', error);
      
      // Enhanced error logging with full context
      loggingService.logError({
        errorType: 'agent_credit_deduction_exception',
        errorMessage: error instanceof Error ? error.message : 'Exception in agent credit deduction',
        component: 'AgentService.deductCreditsAfterUse',
        additionalData: { 
          agentId,
          userId: userId || 'anonymous',
          sessionId: sessionId || 'none',
          timestamp: new Date().toISOString(),
          stackTrace: error instanceof Error ? error.stack : undefined
        },
        severity: 'critical'
      });

      return false;
    }
  }

  public async generateAgentResponse(
    message: string,
    agent: Agent,
    conversationHistory: ChatMessage[] = [],
    userId?: string,
    skipCreditDeduction: boolean = false,
    sessionId?: string,
    selectedModel?: AIModel
  ): Promise<ChatMessage> {
    // Enhanced logging for debugging credit deduction flow
    loggingService.logActivity({
      eventType: 'agent_response_started',
      eventCategory: 'agent_interaction',
      eventData: {
        agentId: agent.id,
        userId: userId || 'anonymous',
        messageLength: message.length,
        hasHistory: conversationHistory.length > 0,
        historyLength: conversationHistory.length,
        selectedModel: selectedModel || this.getAgentModel(agent.id)
      }
    });

    try {
      // 1. CRITICAL: Check credits before processing (but don't block if already deducted)
      const creditCheck = await this.checkCreditsBeforeUse(agent.id, userId);
      
      // Log credit check result in detail
      loggingService.logActivity({
        eventType: 'agent_credit_check_detailed',
        eventCategory: 'credits',
        eventData: {
          agentId: agent.id,
          userId: userId || 'anonymous',
          canUse: creditCheck.canUse,
          required: creditCheck.required,
          available: creditCheck.available,
          error: creditCheck.error,
          checkTimestamp: new Date().toISOString(),
          skipCreditDeduction,
          selectedModel: selectedModel || this.getAgentModel(agent.id)
        }
      });
      
      // Only block processing if credits insufficient AND we haven't already deducted them
      if (!creditCheck.canUse && !skipCreditDeduction) {
        // Return a paywall message instead of processing
        return {
          id: Date.now().toString(),
          content: `## Insufficient Credits 💳

You need **${creditCheck.required} credit${creditCheck.required !== 1 ? 's' : ''}** to use ${agent.name}, but you only have **${creditCheck.available}**.

**Options to continue:**
- [Subscribe for $9.99/month] - Get 250 credits monthly
- [Buy credit top-up] - Starting from $4.99 for 100 credits
- [View pricing plans] - Compare all options

Your current balance: **${creditCheck.available} credits**

*Credits are used to ensure fair access to our AI agents and cover computational costs.*`,
          timestamp: new Date(),
          sender: 'agent',
          agentId: agent.id,
          model: selectedModel || this.getAgentModel(agent.id)
        };
      }

      // 2. Check if this is an initial action button click
      const isInitialAction = this.isInitialActionButton(message, agent.id);
      
      if (isInitialAction) {
        // For initial actions, deduct credits only if not already deducted
        if (!skipCreditDeduction) {
          const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const deductionSuccess = await this.deductCreditsAfterUse(agent.id, userId, sessionId);
          
          if (!deductionSuccess) {
            // If deduction fails, return error message
            return {
              id: Date.now().toString(),
              content: `## Credit Processing Error 🔧

There was an issue processing your credits. Please try again or contact support if the problem persists.

**Your current balance:** ${creditCheck.available} credits
**Required for this action:** ${creditCheck.required} credits

Please refresh the page and try again.`,
              timestamp: new Date(),
              sender: 'agent',
              agentId: agent.id,
              model: selectedModel || this.getAgentModel(agent.id)
            };
          }
        }

        // Return immediate response for action button
        const initialResponse = this.getInitialResponse(message, agent.id);
        return {
          id: Date.now().toString(),
          content: initialResponse,
          timestamp: new Date(),
          sender: 'agent',
          agentId: agent.id,
          model: selectedModel || this.getAgentModel(agent.id)
        };
      }

      // 3. For regular messages, deduct credits only if not already deducted
      if (!skipCreditDeduction) {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Log before deduction attempt
        loggingService.logActivity({
          eventType: 'credit_deduction_attempt',
          eventCategory: 'credits',
          eventData: {
            agentId: agent.id,
            userId: userId || 'anonymous',
            sessionId,
            requiredCredits: creditCheck.required,
            availableCredits: creditCheck.available,
            timestamp: new Date().toISOString()
          }
        });
        
        const deductionSuccess = await this.deductCreditsAfterUse(agent.id, userId, sessionId);
        
        // Log deduction result in detail
        loggingService.logActivity({
          eventType: 'credit_deduction_result',
          eventCategory: 'credits',
          eventData: {
            agentId: agent.id,
            userId: userId || 'anonymous',
            sessionId,
            success: deductionSuccess,
            requiredCredits: creditCheck.required,
            timestamp: new Date().toISOString()
          }
        });
        
        if (!deductionSuccess) {
          // If deduction fails, return error message
          return {
            id: Date.now().toString(),
            content: `## Credit Processing Error 🔧

There was an issue processing your credits. Please try again or contact support if the problem persists.

**Your current balance:** ${creditCheck.available} credits
**Required for this action:** ${creditCheck.required} credits

Please refresh the page and try again.`,
            timestamp: new Date(),
            sender: 'agent',
            agentId: agent.id,
            model: selectedModel || this.getAgentModel(agent.id)
          };
        }
      } else {
        // If credits were pre-deducted, just log for tracking
        loggingService.logActivity({
          eventType: 'credit_pre_deducted',
          eventCategory: 'credits',
          eventData: {
            agentId: agent.id,
            userId: userId || 'anonymous',
            requiredCredits: creditCheck.required,
            timestamp: new Date().toISOString(),
            note: 'Credits were deducted at UI level before AgentService call'
          }
        });
      }

      const systemPrompt = this.agentPersonalities[agent.id] || 
        `You are ${agent.name}, ${agent.role}. ${agent.description} 

Respond in character and provide helpful, relevant advice. Format responses with:
- Clear structure using markdown
- Lists for enumerations
- Code blocks when relevant
- Professional but friendly tone
- Practical recommendations

**Choice System:**
When appropriate, offer users choice options in the format [Option 1], [Option 2], [Option 3] to clarify their needs or guide the conversation.`;
      
      // Use selected model or fallback to agent's default model
      const model = selectedModel || this.getAgentModel(agent.id);
      const provider = this.getProviderFromModel(model);
      
      // Convert chat history to conversation format
      const context = this.convertToConversationHistory(conversationHistory);
      
      const result = await aiService.processQueryWithPersonality(
        message,
        context,
        systemPrompt,
        model,
        agent.id
      );

      // Log successful credit deduction and AI processing
      loggingService.logActivity({
        eventType: 'agent_response_with_credits_deducted',
        eventCategory: 'credits',
        eventData: {
          agentId: agent.id,
          creditsCost: creditCheck.required,
          messageLength: message.length,
          responseLength: result.content.length,
          sessionId,
          modelUsed: model
        }
      });

      // Create response message
      const response: ChatMessage = {
        id: Date.now().toString(),
        content: result.content,
        timestamp: new Date(),
        sender: 'agent',
        agentId: agent.id,
        model: result.model
      };

      return response;
    } catch (error) {
      console.error('Failed to generate agent response:', error);
      
      loggingService.logError({
        errorType: 'agent_response_generation_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to generate agent response',
        component: 'AgentService.generateAgentResponse',
        additionalData: { 
          agentId: agent.id,
          messageLength: message.length,
          selectedModel: selectedModel || this.getAgentModel(agent.id)
        },
        severity: 'high'
      });
      
      // Fallback response with formatting and choices
      return {
        id: Date.now().toString(),
        content: `## Sorry for the technical difficulties

I'm experiencing some technical issues right now and can't properly process your request.

**What would you like to do?**

[Try again]
[Ask a different question]
[Contact support]

I'll be back to full functionality soon! 🔧`,
        timestamp: new Date(),
        sender: 'agent',
        agentId: agent.id,
        model: selectedModel || this.getAgentModel(agent.id)
      };
    }
  }

  private isInitialActionButton(message: string, agentId: string): boolean {
    const agentActions = this.initialResponses[agentId];
    if (!agentActions) return false;
    
    return Object.keys(agentActions).includes(message);
  }

  private getInitialResponse(action: string, agentId: string): string {
    const agentResponses = this.initialResponses[agentId];
    if (!agentResponses) {
      return `## Welcome! 

I'm ready to help you with "${action}". Please provide more details about what you'd like me to work on, and I'll get started right away!

**What would you like to focus on?**

[Share your specific requirements]
[Ask questions about my approach]
[Get examples of my work]

Let's create something amazing together! ✨`;
    }
    
    return agentResponses[action] || agentResponses[Object.keys(agentResponses)[0]];
  }

  public async generateQuickResponse(
    action: string,
    agent: Agent
  ): Promise<string> {
    const prompts: Record<string, Record<string, string>> = {
      'Ask Question': {
        '1': 'Help me improve this prompt: ',
        '2': 'Analyze this competitor from the link: ',
        '3': 'Create FAQ for this product/service: ',
        '4': 'Transform this customer problem into insight: ',
        '5': 'Create a launch checklist for: ',
        '6': 'Write a response to this message: ',
        '7': 'Make this text more human: ',
        '8': 'Add humor to this text: '
      },
      'Solve Problem': {
        '1': 'My prompt isn\'t working effectively: ',
        '2': 'Can\'t find competitor weaknesses: ',
        '3': 'Need questions for FAQ section: ',
        '4': 'How to turn this pain into value: ',
        '5': 'What to include in launch checklist: ',
        '6': 'How to respond to difficult message: ',
        '7': 'This text sounds too robotic: ',
        '8': 'Text is too boring, needs humor: '
      },
      'Analyze Data': {
        '1': 'Analyze the effectiveness of this prompt: ',
        '2': 'Conduct analysis of this competitor: ',
        '3': 'Analyze these frequently asked questions: ',
        '4': 'Analyze these customer reviews: ',
        '5': 'Analyze launch readiness: ',
        '6': 'Analyze this conversation: ',
        '7': 'Analyze this AI-generated text: ',
        '8': 'Analyze the humor in this text: '
      },
      'Generate Content': {
        '1': 'Create a prompt for: ',
        '2': 'Create competitor report: ',
        '3': 'Create FAQ for: ',
        '4': 'Create value proposition for: ',
        '5': 'Create checklist for: ',
        '6': 'Create response templates for: ',
        '7': 'Create human version of: ',
        '8': 'Create humorous version of: '
      },
      'Provide Feedback': {
        '1': 'Give feedback on this prompt: ',
        '2': 'Evaluate this competitive analysis: ',
        '3': 'Evaluate these FAQs: ',
        '4': 'Evaluate this value proposition: ',
        '5': 'Evaluate this checklist: ',
        '6': 'Evaluate these customer responses: ',
        '7': 'Evaluate the quality of this text: ',
        '8': 'Evaluate the appropriateness of humor: '
      }
    };

    const agentPrompts = prompts[action];
    return agentPrompts?.[agent.id] || prompts[action]?.['1'] || `Help me with: `;
  }
}

export const agentService = new AgentService();