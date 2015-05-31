var validation =
(function () {
  'use strict';

  function ValidatorRuleComponent(name, rule, options) { //function (obj, value) - return bool
    options = options || {};
    this.passOnNull = options.passOnNull === undefined ? true : options.passOnNull;
    this.runForEachItem = false;
    this.compareValue = options.compareValue;
    this.convertArrayToLength = options.convertArrayToLength === undefined ? false : options.convertArrayToLength;
    this.name = name;
    this.rule = rule;
    this.constraints = [];// function(obj) - return bool
  }

  ValidatorRuleComponent.prototype = {
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
    when: function (constraint) {
      this.constraints.push(constraint);
      return this;
    },
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

  function ValidatorRule() {
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
    ruleFor: function(target, config) {
      var rule = this.rules[target] || (this.rules[target] = new ValidatorRule(target));
      config(rule);
      return rule;
    },
    registerNested: function(target) {
      this.nesteds.push(target);
    },
    applyTo: function (constructor) {
      constructor.prototype.$$validator = this;
      constructor.prototype.$validate = function () {
        return this.$$validator.validate(this);
      };
    },
    validate: function (obj) {
      var errors = {error: false};
      var target;
      for (target in this.rules) {
        if (!this.rules.hasOwnProperty(target)) {
          continue;
        }

        var results = this.rules[target].validate(obj, obj[target]);
        errors[target] = results;
        if (results.error) {
          errors.error = true;
        }
      }

      for (var i = 0; i < this.nesteds.length; i++) {
        target = this.nesteds[i];

        if (obj[target] && obj[target].$validate){
          var r = obj[target].$validate();
          if (!errors[target]) {
            errors[target] = {};
          }

          for (var childField in r) {//if a validator name matched a field name we'd get a collision here
            errors[target][childField] = r[childField];
          }

          if (r.error) {
            errors.error = true;
          }
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
    var rex = /^\S+@\S+\.\S+$/;//very basic email validation
    var component = new ValidatorRuleComponent('email', function (obj, value) {
      return rex.test(value);
    }, { passOnNull: true });

    this.addComponent(component);
    return component;
  };

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

  return {
    Validator : Validator,
    ValidatorRule: ValidatorRule,
    ValidatorRuleComponent: ValidatorRuleComponent
  };
})();
