this.assent = {};
(function (ns) {
  'use strict';

  /**
  * Validator Component compare value callback
  *
  * @callback validatorCompareValueCallback
  * @param {Object} obj - The object being validated
  */

  /**
  * Validator Component rule callback.
  *
  * @callback validatorRuleCallback
  * @param {Object} obj - The object being validated
  * @param {Object|Object[]} modelValue - The value of the target field being validated. Can be anything, or an array of anything.
  * @param {Object|Object[]|validatorCompareValueCallback} [compareValue] - An optional value provided if a value or function was provided at initialisation to compare against.
  */

  /**
  * Defines a validation component to apply to a rule.
  * @param {String} name - The name of the component, eg. notEmpty, minLength etc
  * @param {validatorRuleCallback} rule - The rule (a function) to execute at validation time to determine if valid or not
  * @param {Object} [options] - The component options
  * @param {Object|Function} [options.compareValue] - A static value or function to be used by the rule function. If a function is provided the returned value is passed to the rule function (not the function itself).
  * @param {boolean} [options.passOnNull=false] - If true when the target model value is null or undefined this rule component will pass
  * @param {boolean} [options.convertArrayToLength=false] - If true when the model value is an array instead of the value being supplied to the rule function, the length of the array is provided instead. Useful for rules that target both strings and arrays.
  */
  function ValidatorRuleComponent(name, rule, options) {
    options = options || {};
    this.passOnNull = options.passOnNull === undefined ? true : options.passOnNull;
    this.runForEachItem = false;
    this.compareValue = options.compareValue;
    this.convertArrayToLength = options.convertArrayToLength === undefined ? false : options.convertArrayToLength;
    this.name = name;
    this.rule = rule;
    this.constraints = [];
  }

  ValidatorRuleComponent.prototype = {
    /** @private */
    getCompareValue: function (obj) {
      var value = this.compareValue;
      if (value === undefined) {
        return undefined;
      }
      var isDate = false;

      if (value instanceof Function) {
        value = value(obj);
      }

      if (value instanceof Date) {
        value = value.valueOf();
        isDate = true;
      }

      return { value: value, isDate: isDate };
    },
    /** @private */
    resolveModelValue: function (modelValue, isDate) {
      if (!this.runForEachItem && this.convertArrayToLength && modelValue instanceof Array) {
        return modelValue.length;
      }

      if (isDate) {
        if (!(modelValue instanceof Date))
        {
          var x = Date.parse(modelValue);
          if (isNaN(x)) {
            return null;
          }

          return x;
        }
        return modelValue.valueOf();
      }

      return modelValue;
    },
    /**
    * Call this to apply a constraint. If the constraint does not pass the rule will not be run (and is considered valid).
    * @param {Function} constraint - The function to add as a constraint. Must return true or false. It is passed the object being validated is it's only argument when called.
    */
    when: function (constraint) {
      this.constraints.push(constraint);
      return this;
    },
    /** @private */
    canRun: function (obj) {
      var pass = true;
      for (var constraint in this.constraints) {
        if (!this.constraints.hasOwnProperty(constraint)) {
          continue;
        }

        if (!this.constraints[constraint](obj)){
          pass = false;
          break;
        }
      }

      return pass;
    },
    /** @private */
    isValid: function (obj, value) {
      var compareValue = this.getCompareValue(obj);
      if (compareValue === undefined) {
        compareValue = { value: null, isDate: false };
      }
      else {
        if (this.passOnNull && (compareValue.value === null || compareValue.value === undefined)) {
          return true;
        }
      }

      var modelValue = this.resolveModelValue(value, compareValue.isDate);
      if (this.passOnNull && (modelValue === null || modelValue === undefined)) {
        return true;
      }

      return this.rule(obj, modelValue, compareValue.value);
    },
    /**
    * The validation message to display when a failure occurs
    */
    withMessage: function (msg, msgVars) {
      this.msg = msg;
      if (msgVars !== undefined) {
        this.msgVars = msgVars;
      }

      if (this.msg && this.msgVars) {
        var splitMsg = this.msg.split('{|}');
        if (splitMsg.length > 1) {
          this.$splitMsg = splitMsg;
          this.$args = [];

          if (this.msgArgs) {
            this.$args = this.$args.concat(this.msgArgs);
          }
        }
      }
      else {
        delete this.$splitMsg;
        delete this.$args;
      }

      return this;
    },
    /** @private */
    getMessage: function (obj) {
      var msg = this.msg;
      if (this.$splitMsg) {
        var vars = this.msgVars.apply(null, [obj].concat(this.$args));
        var finalMsg = [];
        for (var i = 0; i < this.$splitMsg.length; i++) {
          finalMsg.push(this.$splitMsg[i]);
          if (vars[i]) {
            finalMsg.push(vars[i]);
          }
        }

        return finalMsg.join('');
      }

      return msg;
    },
    validateCollection: function (runForEachItem) {
      runForEachItem = runForEachItem === undefined ? true : runForEachItem;
      this.runForEachItem = runForEachItem;
    },
    /** @private */
    run: function (obj, value) {
      var result = { error: false };
      var canRun = this.canRun(obj);
      var isValid;
      if (canRun) {
        if (value instanceof Array && this.runForEachItem) {
          result = [];
          result.error = false;

          for(var i = 0; i < value.length; i++) {
            isValid = this.isValid(obj, value[i]);
            if (!isValid) {
              result.push({ message: this.getMessage(obj), error: true });
              result.error = true;
            }
            else {
              result.push({ error: false });
            }
          }
        }
        else{
          isValid = this.isValid(obj, value);
          if (!isValid) {
            result.message = this.getMessage(obj);
            result.error = true;
          }
        }
      }

      return result;
    }
  };

  /**
  * Defines a validation rule. A validation rule is a collection of validation components to apply to a field.
  * @constructor
  */
  function ValidatorRule() {
    /** @member {ValidatorRuleComponent[]} */
    this.components = [];
  }

  ValidatorRule.prototype = {
    addComponent: function (component) {
      this.components.push(component);
    },
    validate: function (obj, value) {
      var results = { error: false };
      for (var component in this.components) {
        if (!this.components.hasOwnProperty(component)) {
          continue;
        }

        var c = this.components[component];
        results[c.name] = c.run(obj, value);
        if (results[c.name].error) {
          results.error = true;
        }
      }

      return results;
    }
  };

  /**
  * @constructor
  */
  function ValidationResult () {
    /**
    * True if one or more components failed validation.
    * @member {boolean} error
    */
    this.error = false;
  }

  ValidationResult.prototype = {
    addRuleResult: function (target, result) {
      this[target] = result;
      if (result.error === true) {
        this.error = true;
      }
    },
    addNestedResult: function (target, result) {
      if (this[target] !== undefined) {
        this[target] = {};
      }

      for (var childField in result) {//if a validator name matched a field name we'd get a collision here
        this[target][childField] = result[childField];
      }

      if (result.error) {
        this.error = true;
      }
    }
  };

  /**
  * Validator configuration callback.
  *
  * @callback validatorCallback
  * @param {Validator} validator - The validator instance to configure
  */

  /**
  * Validator rule configuration callback
  * @callback ruleCallback
  * @param {ValidatorRule} rule - The validator rule instance to configure
  */

  /**
  * Represents a on object validation rule
  * @constructor
  * @param {validatorCallback} [config] - A configuration function to call during initialisation
  * @param {Function} [constructor] - The constructor to apply the validator to
  * @example
  * var userValidator = new Validator(function (c) {
  *  c.ruleFor('username', function (f) {
  *    f.notEmpty()
  *      .withMessage('username is required');
  *  }, User);
  */
  function Validator (config, constructor) {
    this.rules = {};
    this.nesteds = [];
    this.errors = {};
    if (config) {
      config(this);
    }
    if (constructor) {
      this.applyTo(constructor);
    }
  }

  Validator.prototype = {
    /**
    * Add and create a rule for the validator
    * @param {String} target - The field (cannot be an expression) of the object to create a rule for
    * @param {ruleCallback} config - The configuration callback used to configure the rule
    * @returns {ValidatorRule}
    */
    ruleFor: function(target, config) {
      var rule = this.rules[target] || (this.rules[target] = new ValidatorRule(target));
      config(rule);
      return rule;
    },
    /**
    * Register a field as a nested validator. The value of the field should be an object with a seperate validator definition.
    * The results of the nested validator will be included in the parent validators results. Note you can still define rules for fields that are nested validators.
    * @param {String} target - The field (cannot be an expression) of the object to conduct nested validation on.
    */
    registerNested: function(target) {
      this.nesteds.push(target);
    },
    /**
    * Applies this validator to the provided object constructor. Adds a reference to this validator ($$validator) and $validate method  to the constructors prototype
    * @param {Function} [constructor] - The constructor to apply the validator to
    */
    applyTo: function (constructor) {
      constructor.prototype.$$validator = this;
      constructor.prototype.$validate = function () {
        return this.$$validator.validate(this);
      };
    },
    /**
    * Executes this validation instances rules against the target object
    * @param {Object} obj - The object to validate
    * @returns {ValidationResult}
    */
    validate: function (obj) {
      var errors = new ValidationResult();
      var target;
      for (target in this.rules) {
        if (!this.rules.hasOwnProperty(target)) {
          continue;
        }

        var results = this.rules[target].validate(obj, obj[target]);
        errors.addResult(target, results);
      }

      for (var i = 0; i < this.nesteds.length; i++) {
        target = this.nesteds[i];

        if (obj[target] && obj[target].$validate){
          var r = obj[target].$validate();
          errors.addNestedResult(target, r);
        }
      }

      return errors;
    }
  };

  ValidatorRule.prototype.notEmpty = function () {
    var component = new ValidatorRuleComponent('notEmpty', function (obj, value) {
      return value !== null && value !== 0 && value !== '';
    }, { passOnNull: false, convertArrayToLength: true });

    this.addComponent(component);
    return component;
  };

  ValidatorRule.prototype.email = function () {
    var rex = ValidatorRule.prototype.email.rex;
    var component = new ValidatorRuleComponent('email', function (obj, value) {
      return rex.test(value);
    }, { passOnNull: true });

    this.addComponent(component);
    return component;
  };


  ValidatorRule.prototype.email.rex = /^\S+@\S+\.\S+$/;//very crap regex :'(

  ValidatorRule.prototype.regex = function (rex, name) {
    var component = new ValidatorRuleComponent(name, function (obj, value) {
      return rex.test(value);
    }, { passOnNull: true });

    this.addComponent(component);
    return component;
  };

  ValidatorRule.prototype.minLength = function (minLength) {
    var component = new ValidatorRuleComponent('minLength', function (obj, modelValue, compareValue) {
      if (typeof modelValue === 'string'){
        modelValue = modelValue.length;
      }
      return modelValue >= compareValue;
    }, { passOnNull: true, compareValue: minLength });
    component.msgArgs = [minLength];
    component.msgVars = function () { return [minLength]; };

    this.addComponent(component);
    return component;
  };

  ValidatorRule.prototype.maxLength = function (maxLength) {
    var component = new ValidatorRuleComponent('maxLength', function (obj, modelValue, compareValue) {
      if (typeof modelValue === 'string'){
        modelValue = modelValue.length;
      }
      return modelValue <= compareValue;
    }, { passOnNull: true, compareValue: maxLength });
    component.msgArgs = [maxLength];
    component.msgVars = function () { return [maxLength]; };

    this.addComponent(component);
    return component;
  };

  ValidatorRule.prototype.matches = function matches(compareTo) {
    var component = new ValidatorRuleComponent('matches', function (obj, modelValue, compareValue) {
      return modelValue === compareValue;
    }, { passOnNull: true, compareValue: compareTo });

    component.msgArgs = [compareTo];
    component.msgVars = function (obj) { return [compareTo instanceof Function ? compareTo(obj) : compareTo]; };

    this.addComponent(component);
    return component;
  };

  ValidatorRule.prototype.min = function (minValue) {
    var component = new ValidatorRuleComponent('min', function (obj, modelValue, compareValue) {
      return modelValue >= compareValue;
    }, { passOnNull: true, compareValue: minValue });

    component.msgArgs = [minValue];
    component.msgVars = function () { return [minValue]; };

    this.addComponent(component);
    return component;
  };

  ValidatorRule.prototype.max = function (maxValue) {
    var component = new ValidatorRuleComponent('max', function (obj, modelValue, compareValue) {
      return modelValue <= compareValue;
    }, { passOnNull: true, compareValue: maxValue });
    component.msgArgs = [maxValue];
    component.msgVars = function () { return [maxValue]; };

    this.addComponent(component);
    return component;
  };

  ns.Validator = Validator;
  ns.ValidatorRule = ValidatorRule;
  ns.ValidatorRuleComponent = ValidatorRuleComponent;
})(this.assent);
