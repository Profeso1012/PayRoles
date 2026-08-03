import { ArrowLeft, BookOpen, Calculator, Code, Lightbulb, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';

export default function FormulaGuide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-white via-white to-mint-light/20">
      {/* Header */}
      <div className="bg-deep-cash text-white">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-mint-light/80 hover:text-white mb-4 sm:mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-mint-light/20 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <Calculator size={24} className="text-mint-light sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Pay Element Formula Guide</h1>
              <p className="text-mint-light/80 text-sm sm:text-lg">
                Learn how to create powerful, flexible pay calculations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        {/* Introduction */}
        <section className="bg-white rounded-xl sm:rounded-2xl border border-mint-light p-4 sm:p-8 mb-4 sm:mb-8 shadow-sm">
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <BookOpen size={20} className="text-cash-green shrink-0 mt-0.5 sm:w-6 sm:h-6" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-deep-cash mb-2 sm:mb-3">What are Formulas?</h2>
              <p className="text-sm sm:text-base text-cash-green/80 leading-relaxed mb-3 sm:mb-4">
                Formulas allow you to automatically calculate pay element amounts based on other values
                in an employee's pay calculation. Instead of manually entering fixed amounts for each
                employee, you can write expressions that reference base pay components, other pay elements,
                and use mathematical functions.
              </p>
              <p className="text-sm sm:text-base text-cash-green/80 leading-relaxed">
                For example, a transport allowance of 10% of gross pay would be: <code className="bg-soft-white px-2 py-1 rounded text-deep-cash font-mono text-xs sm:text-sm">gross * 0.1</code>
              </p>
            </div>
          </div>
        </section>

        {/* Base Variables */}
        <section className="bg-white rounded-xl sm:rounded-2xl border border-mint-light p-4 sm:p-8 mb-4 sm:mb-8 shadow-sm">
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Code size={20} className="text-cash-green shrink-0 mt-0.5 sm:w-6 sm:h-6" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-deep-cash mb-2 sm:mb-3">Base Variables</h2>
              <p className="text-sm sm:text-base text-cash-green/80 leading-relaxed mb-4 sm:mb-6">
                These variables are always available in any formula. They represent aggregated values
                calculated from all the employee's pay elements.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="border border-mint-light rounded-lg p-4">
                  <code className="text-sm font-bold text-deep-cash bg-soft-white px-2 py-1 rounded">gross</code>
                  <p className="text-sm text-cash-green/70 mt-2">Total of all earnings before any deductions</p>
                </div>
                <div className="border border-mint-light rounded-lg p-4">
                  <code className="text-sm font-bold text-deep-cash bg-soft-white px-2 py-1 rounded">basic</code>
                  <p className="text-sm text-cash-green/70 mt-2">Employee's basic salary amount</p>
                </div>
                <div className="border border-mint-light rounded-lg p-4">
                  <code className="text-sm font-bold text-deep-cash bg-soft-white px-2 py-1 rounded">basicSalary</code>
                  <p className="text-sm text-cash-green/70 mt-2">Alias for basic (same as above)</p>
                </div>
                <div className="border border-mint-light rounded-lg p-4">
                  <code className="text-sm font-bold text-deep-cash bg-soft-white px-2 py-1 rounded">allowances</code>
                  <p className="text-sm text-cash-green/70 mt-2">Sum of all allowance-type earnings</p>
                </div>
                <div className="border border-mint-light rounded-lg p-4">
                  <code className="text-sm font-bold text-deep-cash bg-soft-white px-2 py-1 rounded">taxableIncome</code>
                  <p className="text-sm text-cash-green/70 mt-2">Income subject to taxation after exemptions</p>
                </div>
                <div className="border border-mint-light rounded-lg p-4">
                  <code className="text-sm font-bold text-deep-cash bg-soft-white px-2 py-1 rounded">grossPay</code>
                  <p className="text-sm text-cash-green/70 mt-2">Same as gross (total earnings)</p>
                </div>
                <div className="border border-mint-light rounded-lg p-4">
                  <code className="text-sm font-bold text-deep-cash bg-soft-white px-2 py-1 rounded">netPay</code>
                  <p className="text-sm text-cash-green/70 mt-2">Take-home pay after all deductions</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pay Element Codes */}
        <section className="bg-white rounded-xl sm:rounded-2xl border border-mint-light p-4 sm:p-8 mb-4 sm:mb-8 shadow-sm">
          <h2 className="text-lg sm:text-2xl font-bold text-deep-cash mb-3 sm:mb-4">Referencing Other Pay Elements</h2>
          <p className="text-sm sm:text-base text-cash-green/80 leading-relaxed mb-4 sm:mb-6">
            You can reference any other pay element by using its <strong>CODE</strong> (in UPPER_SNAKE_CASE).
            This allows you to build calculations on top of other calculated values.
          </p>
          
          <div className="bg-soft-white rounded-lg p-4 sm:p-6 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg border border-mint-light flex items-center justify-center shrink-0">
                <Lightbulb size={16} className="text-cash-green sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-deep-cash">Example</h3>
            </div>
            <p className="text-xs sm:text-sm text-cash-green/80 mb-2 sm:mb-3">
              If you have a pay element with code <code className="bg-white px-2 py-1 rounded text-deep-cash font-mono text-xs">HOUSING_ALLOWANCE</code>,
              you can reference it in other formulas:
            </p>
            <div className="bg-white border border-mint-light rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm">
              <div className="text-cash-green/60 mb-1">// Meal allowance is 50% of housing allowance</div>
              <div className="text-deep-cash">HOUSING_ALLOWANCE * 0.5</div>
            </div>
          </div>

          <div className="bg-white border border-mint-light rounded-lg p-3 sm:p-4">
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=200&fit=crop&auto=format&q=80" 
              alt="Pay element reference example"
              className="w-full rounded border border-mint-light"
            />
            <p className="text-xs text-cash-green/60 text-center mt-2">Screenshot: Referencing another pay element in a formula</p>
          </div>
        </section>

        {/* Functions */}
        <section className="bg-white rounded-xl sm:rounded-2xl border border-mint-light p-4 sm:p-8 mb-4 sm:mb-8 shadow-sm">
          <h2 className="text-lg sm:text-2xl font-bold text-deep-cash mb-3 sm:mb-4">Available Functions</h2>
          <p className="text-sm sm:text-base text-cash-green/80 leading-relaxed mb-4 sm:mb-6">
            Use these built-in functions to perform advanced calculations:
          </p>

          <div className="space-y-4 sm:space-y-6">
            {/* max() */}
            <div className="border-l-4 border-fresh-cash pl-3 sm:pl-6">
              <h3 className="text-sm sm:text-lg font-bold text-deep-cash mb-2">
                <code className="bg-soft-white px-2 py-1 rounded text-xs sm:text-sm">max(value1, value2, ...)</code>
              </h3>
              <p className="text-xs sm:text-base text-cash-green/80 mb-2 sm:mb-3">Returns the largest value from the provided arguments.</p>
              <div className="bg-soft-white rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm">
                <div className="text-cash-green/60 mb-1">// Pension contribution: 8% of basic or minimum 5000</div>
                <div className="text-deep-cash">max(basic * 0.08, 5000)</div>
              </div>
            </div>

            {/* min() */}
            <div className="border-l-4 border-cash-gold pl-3 sm:pl-6">
              <h3 className="text-sm sm:text-lg font-bold text-deep-cash mb-2">
                <code className="bg-soft-white px-2 py-1 rounded text-xs sm:text-sm">min(value1, value2, ...)</code>
              </h3>
              <p className="text-xs sm:text-base text-cash-green/80 mb-2 sm:mb-3">Returns the smallest value from the provided arguments.</p>
              <div className="bg-soft-white rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm">
                <div className="text-cash-green/60 mb-1">// Housing cap: 20% of gross but never more than 100000</div>
                <div className="text-deep-cash">min(gross * 0.2, 100000)</div>
              </div>
            </div>

            {/* round() */}
            <div className="border-l-4 border-fresh-cash pl-3 sm:pl-6">
              <h3 className="text-sm sm:text-lg font-bold text-deep-cash mb-2">
                <code className="bg-soft-white px-2 py-1 rounded text-xs sm:text-sm">round(value, decimals)</code>
              </h3>
              <p className="text-xs sm:text-base text-cash-green/80 mb-2 sm:mb-3">Rounds a number to specified decimal places (default: 0).</p>
              <div className="bg-soft-white rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm">
                <div className="text-cash-green/60 mb-1">// Round to nearest whole number</div>
                <div className="text-deep-cash mb-2">round(gross * 0.075)</div>
                <div className="text-cash-green/60 mb-1">// Round to 2 decimal places</div>
                <div className="text-deep-cash">round(gross * 0.075, 2)</div>
              </div>
            </div>

            {/* if() */}
            <div className="border-l-4 border-cash-gold pl-3 sm:pl-6">
              <h3 className="text-sm sm:text-lg font-bold text-deep-cash mb-2">
                <code className="bg-soft-white px-2 py-1 rounded text-xs sm:text-sm">if(condition, trueValue, falseValue)</code>
              </h3>
              <p className="text-xs sm:text-base text-cash-green/80 mb-2 sm:mb-3">Returns one value if condition is true, another if false.</p>
              <div className="bg-soft-white rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm space-y-3">
                <div>
                  <div className="text-cash-green/60 mb-1">// Bonus for high earners only</div>
                  <div className="text-deep-cash">if(gross {'>'} 200000, 10000, 0)</div>
                </div>
                <div>
                  <div className="text-cash-green/60 mb-1">// Different rates based on salary tier</div>
                  <div className="text-deep-cash">if(basic {'>'} 100000, basic * 0.15, basic * 0.10)</div>
                </div>
              </div>
            </div>

            {/* sum() */}
            <div className="border-l-4 border-fresh-cash pl-3 sm:pl-6">
              <h3 className="text-sm sm:text-lg font-bold text-deep-cash mb-2">
                <code className="bg-soft-white px-2 py-1 rounded text-xs sm:text-sm">sum(value1, value2, ...)</code>
              </h3>
              <p className="text-xs sm:text-base text-cash-green/80 mb-2 sm:mb-3">Adds multiple values together.</p>
              <div className="bg-soft-white rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm">
                <div className="text-cash-green/60 mb-1">// Total of multiple allowances</div>
                <div className="text-deep-cash break-all">sum(HOUSING_ALLOWANCE, TRANSPORT_ALLOWANCE, MEAL_ALLOWANCE)</div>
              </div>
            </div>

            {/* ceil() & floor() */}
            <div className="border-l-4 border-cash-gold pl-3 sm:pl-6">
              <h3 className="text-sm sm:text-lg font-bold text-deep-cash mb-2">
                <code className="bg-soft-white px-2 py-1 rounded text-xs sm:text-sm">ceil(value)</code> & <code className="bg-soft-white px-2 py-1 rounded text-xs sm:text-sm">floor(value)</code>
              </h3>
              <p className="text-xs sm:text-base text-cash-green/80 mb-2 sm:mb-3">Round up (ceil) or down (floor) to nearest integer.</p>
              <div className="bg-soft-white rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm space-y-2">
                <div>
                  <div className="text-cash-green/60 mb-1">// Always round up</div>
                  <div className="text-deep-cash">ceil(gross * 0.025)</div>
                </div>
                <div>
                  <div className="text-cash-green/60 mb-1">// Always round down</div>
                  <div className="text-deep-cash">floor(gross * 0.025)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real-World Examples */}
        <section className="bg-white rounded-xl sm:rounded-2xl border border-mint-light p-4 sm:p-8 mb-4 sm:mb-8 shadow-sm">
          <h2 className="text-lg sm:text-2xl font-bold text-deep-cash mb-3 sm:mb-4">Real-World Examples</h2>
          <p className="text-sm sm:text-base text-cash-green/80 leading-relaxed mb-4 sm:mb-6">
            Here are common use cases and how to implement them with formulas:
          </p>

          <div className="space-y-4 sm:space-y-6">
            {/* Example 1: Percentage of Gross */}
            <div className="bg-gradient-to-br from-soft-white to-mint-light/30 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-mint-light">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-fresh-cash/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-lg sm:text-xl font-bold text-fresh-cash">1</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-deep-cash mb-1 sm:mb-2">Transport Allowance (10% of Gross)</h3>
                  <p className="text-xs sm:text-sm text-cash-green/80 mb-3 sm:mb-4">
                    Every employee gets a transport allowance equal to 10% of their gross pay.
                  </p>
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-mint-light">
                    <div className="text-xs text-cash-green/60 mb-2 uppercase tracking-wide font-semibold">Formula:</div>
                    <code className="text-deep-cash font-mono text-xs sm:text-sm">gross * 0.1</code>
                  </div>
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=180&fit=crop&auto=format" 
                  alt="Transport allowance formula example"
                  className="w-full rounded-lg border border-mint-light"
                />
                <p className="text-xs text-cash-green/60 text-center mt-2">Screenshot: Creating a percentage-based allowance</p>
              </div>
            </div>

            {/* Example 2: Minimum Guarantee */}
            <div className="bg-gradient-to-br from-soft-white to-mint-light/30 rounded-xl p-6 border border-mint-light">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-cash-gold/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-cash-gold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-deep-cash mb-2">Pension with Minimum Amount</h3>
                  <p className="text-sm text-cash-green/80 mb-4">
                    Pension contribution is 8% of basic salary, but never less than ₦5,000.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-mint-light">
                    <div className="text-xs text-cash-green/60 mb-2 uppercase tracking-wide font-semibold">Formula:</div>
                    <code className="text-deep-cash font-mono text-sm">max(basic * 0.08, 5000)</code>
                  </div>
                  <div className="mt-3 text-xs text-cash-green/70 bg-white rounded p-3 border border-mint-light">
                    <strong>How it works:</strong> If basic salary is ₦50,000, 8% = ₦4,000. 
                    Since this is less than the minimum ₦5,000, the employee gets ₦5,000.
                    If basic is ₦100,000, 8% = ₦8,000 which is higher, so they get ₦8,000.
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=180&fit=crop&auto=format" 
                  alt="Pension with minimum guarantee"
                  className="w-full rounded-lg border border-mint-light"
                />
                <p className="text-xs text-cash-green/60 text-center mt-2">Screenshot: Using max() function for minimum guarantees</p>
              </div>
            </div>

            {/* Example 3: Maximum Cap */}
            <div className="bg-gradient-to-br from-soft-white to-mint-light/30 rounded-xl p-6 border border-mint-light">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-fresh-cash/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-fresh-cash">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-deep-cash mb-2">Housing Allowance with Cap</h3>
                  <p className="text-sm text-cash-green/80 mb-4">
                    Housing is 20% of gross salary, but capped at maximum ₦100,000.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-mint-light">
                    <div className="text-xs text-cash-green/60 mb-2 uppercase tracking-wide font-semibold">Formula:</div>
                    <code className="text-deep-cash font-mono text-sm">min(gross * 0.2, 100000)</code>
                  </div>
                  <div className="mt-3 text-xs text-cash-green/70 bg-white rounded p-3 border border-mint-light">
                    <strong>How it works:</strong> If gross is ₦400,000, 20% = ₦80,000 (below cap, so they get ₦80,000).
                    If gross is ₦600,000, 20% = ₦120,000 but this exceeds the cap, so they get ₦100,000.
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&h=180&fit=crop&auto=format" 
                  alt="Housing allowance with maximum cap"
                  className="w-full rounded-lg border border-mint-light"
                />
                <p className="text-xs text-cash-green/60 text-center mt-2">Screenshot: Using min() function for maximum caps</p>
              </div>
            </div>

            {/* Example 4: Conditional Bonus */}
            <div className="bg-gradient-to-br from-soft-white to-mint-light/30 rounded-xl p-6 border border-mint-light">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-cash-gold/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-cash-gold">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-deep-cash mb-2">Performance Bonus (Conditional)</h3>
                  <p className="text-sm text-cash-green/80 mb-4">
                    Employees earning over ₦200,000 gross get a ₦15,000 bonus, others get ₦5,000.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-mint-light">
                    <div className="text-xs text-cash-green/60 mb-2 uppercase tracking-wide font-semibold">Formula:</div>
                    <code className="text-deep-cash font-mono text-sm">if(gross {'>'} 200000, 15000, 5000)</code>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=180&fit=crop&auto=format" 
                  alt="Conditional bonus formula"
                  className="w-full rounded-lg border border-mint-light"
                />
                <p className="text-xs text-cash-green/60 text-center mt-2">Screenshot: Creating conditional pay elements with if()</p>
              </div>
            </div>

            {/* Example 5: Tiered Percentage */}
            <div className="bg-gradient-to-br from-soft-white to-mint-light/30 rounded-xl p-6 border border-mint-light">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-fresh-cash/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-fresh-cash">5</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-deep-cash mb-2">Tiered Commission Rate</h3>
                  <p className="text-sm text-cash-green/80 mb-4">
                    Junior staff get 5% commission, senior staff get 10% based on basic salary threshold.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-mint-light">
                    <div className="text-xs text-cash-green/60 mb-2 uppercase tracking-wide font-semibold">Formula:</div>
                    <code className="text-deep-cash font-mono text-sm">if(basic {'>'} 150000, gross * 0.10, gross * 0.05)</code>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=180&fit=crop&auto=format&q=80" 
                  alt="Tiered commission rate"
                  className="w-full rounded-lg border border-mint-light"
                />
                <p className="text-xs text-cash-green/60 text-center mt-2">Screenshot: Different rates based on salary bands</p>
              </div>
            </div>

            {/* Example 6: Referencing Other Elements */}
            <div className="bg-gradient-to-br from-soft-white to-mint-light/30 rounded-xl p-6 border border-mint-light">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-cash-gold/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-cash-gold">6</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-deep-cash mb-2">Meal Allowance (Based on Housing)</h3>
                  <p className="text-sm text-cash-green/80 mb-4">
                    Meal allowance is calculated as 50% of the housing allowance amount.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-mint-light mb-3">
                    <div className="text-xs text-cash-green/60 mb-2 uppercase tracking-wide font-semibold">Formula:</div>
                    <code className="text-deep-cash font-mono text-sm">HOUSING_ALLOWANCE * 0.5</code>
                  </div>
                  <div className="text-xs text-cash-green/70 bg-white rounded p-3 border border-mint-light">
                    <strong>Note:</strong> Make sure HOUSING_ALLOWANCE is created first with its own code.
                    You can then reference it by its exact code in other formulas.
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=180&fit=crop&auto=format&q=80" 
                  alt="Referencing another pay element"
                  className="w-full rounded-lg border border-mint-light"
                />
                <p className="text-xs text-cash-green/60 text-center mt-2">Screenshot: Building calculations on top of other pay elements</p>
              </div>
            </div>

            {/* Example 7: Complex Calculation */}
            <div className="bg-gradient-to-br from-soft-white to-mint-light/30 rounded-xl p-6 border border-mint-light">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-fresh-cash/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-fresh-cash">7</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-deep-cash mb-2">Total Allowances Sum</h3>
                  <p className="text-sm text-cash-green/80 mb-4">
                    Combine multiple allowances into one total using the sum() function.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-mint-light">
                    <div className="text-xs text-cash-green/60 mb-2 uppercase tracking-wide font-semibold">Formula:</div>
                    <code className="text-deep-cash font-mono text-sm">
                      sum(HOUSING_ALLOWANCE, TRANSPORT_ALLOWANCE, MEAL_ALLOWANCE)
                    </code>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=180&fit=crop&auto=format" 
                  alt="Sum of multiple pay elements"
                  className="w-full rounded-lg border border-mint-light"
                />
                <p className="text-xs text-cash-green/60 text-center mt-2">Screenshot: Aggregating multiple elements with sum()</p>
              </div>
            </div>

            {/* Example 8: Rounding */}
            <div className="bg-gradient-to-br from-soft-white to-mint-light/30 rounded-xl p-6 border border-mint-light">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-cash-gold/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-cash-gold">8</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-deep-cash mb-2">Rounded Deduction</h3>
                  <p className="text-sm text-cash-green/80 mb-4">
                    Calculate a deduction and round to the nearest 100 for cleaner amounts.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-mint-light mb-3">
                    <div className="text-xs text-cash-green/60 mb-2 uppercase tracking-wide font-semibold">Formula:</div>
                    <code className="text-deep-cash font-mono text-sm">round(gross * 0.025 / 100) * 100</code>
                  </div>
                  <div className="text-xs text-cash-green/70 bg-white rounded p-3 border border-mint-light">
                    <strong>How it works:</strong> If gross is 175,000, calculation gives 4,375. 
                    Divided by 100 = 43.75, rounded = 44, multiplied by 100 = 4,400.
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&h=180&fit=crop&auto=format" 
                  alt="Rounding formula example"
                  className="w-full rounded-lg border border-mint-light"
                />
                <p className="text-xs text-cash-green/60 text-center mt-2">Screenshot: Using round() for cleaner amounts</p>
              </div>
            </div>
          </div>
        </section>

        {/* Common Mistakes */}
        <section className="bg-white rounded-xl sm:rounded-2xl border border-mint-light p-4 sm:p-8 mb-4 sm:mb-8 shadow-sm">
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5 sm:w-6 sm:h-6" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-deep-cash mb-2 sm:mb-3">Common Mistakes to Avoid</h2>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="border-l-4 border-red-400 pl-3 sm:pl-4 py-2">
                  <h3 className="font-bold text-deep-cash mb-1 text-sm sm:text-base">Using uppercase for base variables</h3>
                  <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                    <span className="text-red-500 font-mono">GROSS * 0.1</span>
                    <span className="text-cash-green/60">Wrong</span>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm mt-1">
                    <span className="text-fresh-cash font-mono">gross * 0.1</span>
                    <span className="text-cash-green/60">Correct</span>
                  </div>
                  <p className="text-xs text-cash-green/70 mt-2">
                    Base variables like gross, basic, netPay must be lowercase.
                  </p>
                </div>

                <div className="border-l-4 border-red-400 pl-3 sm:pl-4 py-2">
                  <h3 className="font-bold text-deep-cash mb-1 text-sm sm:text-base">Referencing non-existent pay elements</h3>
                  <p className="text-xs sm:text-sm text-cash-green/80 mb-2">
                    Make sure the pay element code you reference actually exists.
                  </p>
                  <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                    <span className="text-red-500 font-mono break-all">BONUS_AMOUNT * 2</span>
                    <span className="text-cash-green/60 shrink-0">Fails if doesn't exist</span>
                  </div>
                </div>

                <div className="border-l-4 border-red-400 pl-3 sm:pl-4 py-2">
                  <h3 className="font-bold text-deep-cash mb-1 text-sm sm:text-base">Circular references</h3>
                  <p className="text-xs sm:text-sm text-cash-green/80 mb-2">
                    Element A cannot reference Element B if Element B already references Element A.
                  </p>
                  <div className="text-xs text-cash-green/70 bg-soft-white rounded p-2 sm:p-3 border border-mint-light mt-2">
                    Example: BONUS references TOTAL_COMP, and TOTAL_COMP references BONUS = Error
                  </div>
                </div>

                <div className="border-l-4 border-red-400 pl-3 sm:pl-4 py-2">
                  <h3 className="font-bold text-deep-cash mb-1 text-sm sm:text-base">Using unsupported functions</h3>
                  <p className="text-xs sm:text-sm text-cash-green/80 mb-2">
                    Only these functions are allowed: max, min, round, ceil, floor, if, sum
                  </p>
                  <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                    <span className="text-red-500 font-mono">sqrt(gross)</span>
                    <span className="text-cash-green/60">Not supported</span>
                  </div>
                </div>

                <div className="border-l-4 border-red-400 pl-3 sm:pl-4 py-2">
                  <h3 className="font-bold text-deep-cash mb-1 text-sm sm:text-base">Missing operators</h3>
                  <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                    <span className="text-red-500 font-mono">gross 0.1</span>
                    <span className="text-cash-green/60">Missing * operator</span>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm mt-1">
                    <span className="text-fresh-cash font-mono">gross * 0.1</span>
                    <span className="text-cash-green/60">Correct</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="bg-gradient-to-br from-fresh-cash/5 to-mint-light/30 rounded-xl sm:rounded-2xl border border-fresh-cash/30 p-4 sm:p-8 mb-4 sm:mb-8">
          <h2 className="text-lg sm:text-2xl font-bold text-deep-cash mb-3 sm:mb-4">Best Practices</h2>
          
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-4 sm:p-5 border border-mint-light">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-fresh-cash/20 rounded-lg flex items-center justify-center shrink-0">
                  <Lightbulb size={14} className="text-fresh-cash sm:w-4 sm:h-4" />
                </div>
                <h3 className="font-bold text-deep-cash text-sm sm:text-base">Use Clear Codes</h3>
              </div>
              <p className="text-xs sm:text-sm text-cash-green/80">
                Name pay element codes descriptively: HOUSING_ALLOWANCE, not HA or HOUSE.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 sm:p-5 border border-mint-light">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-fresh-cash/20 rounded-lg flex items-center justify-center shrink-0">
                  <Lightbulb size={14} className="text-fresh-cash sm:w-4 sm:h-4" />
                </div>
                <h3 className="font-bold text-deep-cash text-sm sm:text-base">Test First</h3>
              </div>
              <p className="text-xs sm:text-sm text-cash-green/80">
                Create the formula on a test employee first to verify calculations before rolling out.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 sm:p-5 border border-mint-light">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-fresh-cash/20 rounded-lg flex items-center justify-center shrink-0">
                  <Lightbulb size={14} className="text-fresh-cash sm:w-4 sm:h-4" />
                </div>
                <h3 className="font-bold text-deep-cash text-sm sm:text-base">Keep It Simple</h3>
              </div>
              <p className="text-xs sm:text-sm text-cash-green/80">
                Break complex calculations into multiple pay elements rather than one giant formula.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 sm:p-5 border border-mint-light">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-fresh-cash/20 rounded-lg flex items-center justify-center shrink-0">
                  <Lightbulb size={14} className="text-fresh-cash sm:w-4 sm:h-4" />
                </div>
                <h3 className="font-bold text-deep-cash text-sm sm:text-base">Document Purpose</h3>
              </div>
              <p className="text-xs sm:text-sm text-cash-green/80">
                Use clear names for pay elements so others understand what they calculate.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Reference Card */}
        <section className="bg-deep-cash text-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg">
          <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">Quick Reference</h2>
          
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-mint-light mb-2 sm:mb-3">Operators</h3>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <code className="text-mint-light">+</code>
                  <span className="text-white/70">Addition</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-mint-light">-</code>
                  <span className="text-white/70">Subtraction</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-mint-light">*</code>
                  <span className="text-white/70">Multiplication</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-mint-light">/</code>
                  <span className="text-white/70">Division</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-mint-light">{'>'}</code>
                  <span className="text-white/70">Greater than</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-mint-light">{'<'}</code>
                  <span className="text-white/70">Less than</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-mint-light">==</code>
                  <span className="text-white/70">Equal to</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-mint-light mb-2 sm:mb-3">Remember</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-mint-light mt-1">•</span>
                  <span>Base variables are lowercase</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-mint-light mt-1">•</span>
                  <span>Pay element codes are UPPER_SNAKE_CASE</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-mint-light mt-1">•</span>
                  <span>Use parentheses to control order of operations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-mint-light mt-1">•</span>
                  <span>Test formulas before applying to all employees</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <div className="mt-8 sm:mt-12 text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/payroll/pay-elements')}
          >
            Create Your First Pay Element
          </Button>
          <p className="text-xs sm:text-sm text-cash-green/60 mt-3 sm:mt-4 px-4">
            Still have questions? Contact your system administrator or support team.
          </p>
        </div>
      </div>
    </div>
  );
}
