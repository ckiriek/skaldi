/**
 * ICF (Informed Consent Form) Section-Specific Prompts
 * 
 * Professional prompts for ICF sections
 * Patient-friendly language (8th grade reading level), regulatory compliant
 * Based on FDA 21 CFR 50.25, ICH E6(R2), OHRP guidance
 * 
 * CRITICAL: Each prompt MUST include {{dataContext}} placeholder
 * The system will inject real data from enrichment sources + Synopsis/Protocol
 * 
 * Version: 2.0.0
 * Date: 2025-11-29
 */

export const ICF_SECTION_PROMPTS: Record<string, string> = {
  icf_title: `<task>
Generate the ICF Title and Introduction section for a clinical trial informed consent form.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level - use simple, everyday words
- Use the ACTUAL compound name, indication, and study details from the data
- DO NOT write "[DATA_NEEDED]" - use the provided data
- Be warm and welcoming while remaining professional
- Explain that this is a research study, not regular medical care
- Reference the Synopsis/Protocol for consistency if provided
</critical_rules>

<required_content>
### Study Title
- Simple version of the full study title
- Include the study drug name and what condition it treats

### Introduction
- You are being asked to take part in a research study
- This form tells you about the study so you can decide if you want to join
- Please read this form carefully and ask questions about anything you don't understand
- Taking part is voluntary - you can say no

### Why This Study Is Being Done
- Brief explanation of the medical condition being studied
- Why researchers are testing this treatment
- What they hope to learn

### Who Is Doing This Study
- Sponsor name (from data)
- Study doctor/investigator role explanation
</required_content>

<output_format>
Use short sentences and paragraphs.
Avoid medical jargon - if you must use a medical term, explain it.
Use "you" and "your" to speak directly to the patient.
</output_format>`,

  icf_purpose: `<task>
Generate the ICF Purpose of the Study section explaining why this research is being done.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Use ACTUAL indication and compound information from the data
- Explain the disease/condition in simple terms
- DO NOT write "[DATA_NEEDED]" - synthesize from available information
- Reference Synopsis rationale if available for consistency
</critical_rules>

<required_content>
### About Your Condition
- Simple explanation of the disease/condition (from indication data)
- How it affects people
- Current treatment options and their limitations

### About the Study Drug
- Name of the study drug: {{compoundName}}
- What type of medicine it is (from mechanism of action)
- How it is thought to work (in simple terms)
- Whether it is approved or experimental

### What This Study Will Try to Learn
- Primary objective in patient-friendly language
- What researchers hope to find out
- How this might help future patients

### How Many People Will Be in This Study
- Target enrollment number (from study design)
- How many study sites/locations
</required_content>

<output_format>
Use analogies and everyday comparisons where helpful.
Break complex concepts into simple steps.
</output_format>`,

  icf_procedures: `<task>
Generate the ICF Study Procedures section describing what will happen during the study.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Use ACTUAL visit schedule and procedures from Protocol/Synopsis if available
- Be specific about what happens at each visit
- DO NOT write "[DATA_NEEDED]" - use provided study design data
- Include time commitments so patients can plan
</critical_rules>

<required_content>
### Overview of What Will Happen
- Brief summary of the study process
- Total time in the study (from study duration data)
- Whether you might get the study drug or a placebo (if applicable)

### Screening Visit (Before You Join)
- What tests will be done to see if you can join
- How long screening takes
- What might make you unable to join

### Study Visits
- How many visits total
- How often you will come in
- What will happen at each visit:
  * Physical exams
  * Blood tests (how much blood, how often)
  * Other tests or procedures
  * Questionnaires
- How long each visit takes

### Taking the Study Drug
- How to take the medicine (pills, injection, etc.)
- How often to take it
- Special instructions (with food, time of day, etc.)

### Between Visits
- What you need to do at home
- Who to call if you have questions
- Keeping a diary (if required)

### End of Study
- What happens when you finish
- Follow-up visits after treatment ends
</required_content>

<output_format>
Use bullet points for lists of procedures.
Include approximate times for visits.
Use a simple timeline or schedule if helpful.
</output_format>`,

  icf_duration: `<task>
Generate the ICF Duration of Participation section explaining time commitment.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Use ACTUAL duration from study design data
- Be specific about time commitments
- DO NOT write "[DATA_NEEDED]" - calculate from available data
</critical_rules>

<required_content>
### How Long Will You Be in This Study?
- Total time from first visit to last visit
- Treatment period duration
- Follow-up period duration

### Time Commitment
- Number of clinic visits
- Approximate time for each visit type
- Phone calls or remote check-ins (if any)
- Total estimated hours over the study

### What Could Change Your Time in the Study
- Early stopping for safety
- If the study drug isn't working
- If you decide to leave
</required_content>

<output_format>
Use specific numbers and timeframes.
Present information in an easy-to-scan format.
</output_format>`,

  icf_risks: `<task>
Generate the ICF Risks and Discomforts section with honest disclosure of potential harms.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Use ACTUAL safety data from FAERS, FDA labels, and adverse events if available
- Be honest and complete about risks
- DO NOT write "[DATA_NEEDED]" - use available safety profile data
- Group side effects by how common they are
- Include procedure-related risks (blood draws, etc.)
</critical_rules>

<required_content>
### Risks of the Study Drug ({{compoundName}})

**Very Common Side Effects** (may affect more than 1 in 10 people)
- List from safety data with patient-friendly descriptions

**Common Side Effects** (may affect up to 1 in 10 people)
- List from safety data

**Less Common Side Effects** (may affect up to 1 in 100 people)
- List from safety data

**Rare but Serious Side Effects**
- Any serious adverse events from safety data
- What to watch for
- When to seek immediate help

### Unknown Risks
- This drug is still being studied
- There may be side effects we don't know about yet

### Risks from Study Procedures
- Blood draws: bruising, discomfort, rare infection
- Other procedure-specific risks

### Pregnancy Risks
- Whether pregnant women can join
- Birth control requirements
- What to do if you become pregnant during the study

### What to Do If You Have Side Effects
- Who to contact
- Emergency procedures
</required_content>

<output_format>
Use clear categories for different risk levels.
Explain medical terms in parentheses.
Be direct but not alarming.
</output_format>`,

  icf_benefits: `<task>
Generate the ICF Potential Benefits section explaining possible advantages of participation.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Be honest - do NOT promise benefits
- Use conditional language ("may," "might," "possible")
- DO NOT write "[DATA_NEEDED]"
- Distinguish between direct benefits and benefits to others
</critical_rules>

<required_content>
### Possible Benefits to You
- The study drug might help your condition
- You will receive careful medical monitoring
- You will learn more about your health
- Be clear: there is no guarantee you will benefit

### Possible Benefits to Others
- Information from this study may help future patients
- May help doctors understand this condition better
- May lead to new treatments

### Important to Understand
- This is research, not guaranteed treatment
- You might receive placebo (if applicable)
- The study drug might not work for you
</required_content>

<output_format>
Be balanced and honest.
Avoid making promises or raising false hopes.
</output_format>`,

  icf_alternatives: `<task>
Generate the ICF Alternative Treatments section describing other options.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Use ACTUAL treatment landscape data if available from FDA labels
- Be fair about alternatives
- DO NOT write "[DATA_NEEDED]"
</critical_rules>

<required_content>
### Other Treatment Options
- You do not have to join this study to get treatment
- Other options that may be available:
  * Approved medications for this condition (from FDA label data)
  * Other clinical trials
  * Standard medical care
  * No treatment / watchful waiting (if appropriate)

### Discuss with Your Doctor
- Your regular doctor can help you understand your options
- You can take time to decide
</required_content>

<output_format>
Present alternatives fairly without steering toward the study.
</output_format>`,

  icf_confidentiality: `<task>
Generate the ICF Confidentiality section explaining how personal information is protected.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Include standard regulatory language in simple terms
- Cover HIPAA, data sharing, and who can see records
- DO NOT write "[DATA_NEEDED]"
</critical_rules>

<required_content>
### How We Protect Your Information
- Your personal information will be kept private
- You will be given a code number instead of using your name
- Your records will be stored securely

### Who May See Your Records
- The study team at this site
- The sponsor of the study
- Government agencies (FDA, etc.) who oversee research
- Ethics committees that approved this study

### What Information Is Collected
- Medical history and test results
- Information about how you respond to treatment
- Demographic information (age, sex, etc.)

### How Long Information Is Kept
- Records may be kept for many years
- Required by law and regulations

### Your Rights
- You can ask to see your study records
- Some information may be kept even if you leave the study
</required_content>

<output_format>
Explain legal requirements in simple terms.
Reassure about privacy protections.
</output_format>`,

  icf_compensation: `<task>
Generate the ICF Compensation and Costs section explaining financial aspects.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Be clear about what is free and what might cost money
- DO NOT write "[DATA_NEEDED]" - use standard language if specifics unavailable
</critical_rules>

<required_content>
### Payment for Taking Part
- Whether you will be paid for your time
- How much and when (if applicable)
- Reimbursement for travel or parking

### Costs to You
- The study drug is provided at no cost
- Study-related tests and visits are provided at no cost
- You may still have costs for:
  * Your regular medical care
  * Treatments not part of the study

### If You Are Injured
- What happens if you are hurt because of the study
- What medical care will be provided
- Whether there is compensation for injuries
- Your rights are not waived by signing this form
</required_content>

<output_format>
Be specific about financial matters.
Clearly separate study costs from regular medical costs.
</output_format>`,

  icf_voluntary: `<task>
Generate the ICF Voluntary Participation section emphasizing freedom to choose.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Emphasize that participation is completely voluntary
- Explain rights clearly
- DO NOT write "[DATA_NEEDED]"
</critical_rules>

<required_content>
### Your Choice to Take Part
- Taking part in this study is completely voluntary
- No one can force you to join
- You can say no without any penalty
- Your regular medical care will not be affected if you say no

### Your Right to Leave
- You can stop being in the study at any time
- You do not have to give a reason
- Your decision will not affect your regular medical care
- Tell the study team if you want to stop

### When the Study Team Might Remove You
- If staying in the study would be unsafe for you
- If you cannot follow the study requirements
- If the study is stopped early

### New Information
- If we learn new information that might affect your decision, we will tell you
- You may be asked to sign a new consent form
</required_content>

<output_format>
Emphasize patient autonomy and rights.
Use reassuring language.
</output_format>`,

  icf_contacts: `<task>
Generate the ICF Contact Information section with who to call for questions.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Provide clear categories of who to contact for what
- DO NOT write "[DATA_NEEDED]" for structure - use placeholders only for specific names/numbers
</critical_rules>

<required_content>
### Questions About the Study
- Study Doctor: [Investigator Name]
- Phone: [Phone Number]
- Available: [Hours/Days]

### Questions About Your Rights as a Research Subject
- Institutional Review Board (IRB) or Ethics Committee
- Phone: [IRB Phone Number]
- This is the group that protects people in research studies

### Medical Emergencies
- If you have a medical emergency, call 911 (or local emergency number)
- Then contact the study team as soon as possible
- 24-hour emergency contact: [Emergency Number]

### General Questions
- Study Coordinator: [Coordinator Name]
- Phone: [Phone Number]
- Email: [Email if applicable]
</required_content>

<output_format>
Make contact information easy to find and use.
Clearly distinguish between different types of questions.
</output_format>`,

  icf_signature: `<task>
Generate the ICF Signature Page with consent statements and signature blocks.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Write at 8th grade reading level
- Include all required consent statements per FDA 21 CFR 50.25
- DO NOT write "[DATA_NEEDED]"
- Use standard regulatory language simplified for patients
</critical_rules>

<required_content>
### Statement of Consent

By signing below, I confirm that:

- I have read this consent form (or it was read to me)
- I have had the chance to ask questions and my questions have been answered
- I understand what the study involves
- I understand the risks and possible benefits
- I know that taking part is voluntary and I can stop at any time
- I agree to take part in this research study
- I will receive a signed copy of this form

### Participant Signature

___________________________________ 
Printed Name of Participant

___________________________________ _______________
Signature of Participant                    Date

### Person Obtaining Consent

I have explained this study to the participant and answered all questions. I believe the participant understands the information in this consent form and freely agrees to participate.

___________________________________ 
Printed Name of Person Obtaining Consent

___________________________________ _______________
Signature                                        Date

### Witness (if required)

___________________________________ 
Printed Name of Witness

___________________________________ _______________
Signature of Witness                        Date
</required_content>

<output_format>
Use clear signature blocks with lines.
Include all legally required statements.
</output_format>`
}

export default ICF_SECTION_PROMPTS
